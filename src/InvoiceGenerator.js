import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { fetchImages } from "./firebase";

const InvoiceGenerator = () => {
  const [invoiceData, setInvoiceData] = useState({
    customerName: "",
    invoiceNumber: "",
    date: new Date().toISOString().split("T")[0],
    items: [{ description: "", quantity: "", amount: "", image: "", imageName: "" }],
    fullAmount: true,
    totalAmount: "",
  });
  const [localImages, setLocalImages] = useState([]);

  useEffect(() => {
    const getImages = async () => {
      const images = await fetchImages();
      setLocalImages(images);
    };
    getImages();
  }, []);

  const handleItemChange = async (index, key, value) => {
    const newItems = [...invoiceData.items];
    newItems[index][key] = value;

    // Load image if it's the 'imageName' being changed
    if (key === "imageName" && value) {
      const selectedImage = localImages.find(img => img.name === value);
      if (selectedImage) {
        const imgBase64 = await getBase64(selectedImage.path);
        newItems[index].image = imgBase64; // Store the Base64 data in the item
      }
    }

    setInvoiceData({ ...invoiceData, items: newItems });
  };

  const addNewItem = () => {
    setInvoiceData({
      ...invoiceData,
      items: [...invoiceData.items, { description: "", quantity: "", amount: "", image: "", imageName: "" }],
    });
  };

  const generatePDF = async () => {
    const doc = new jsPDF();

    // Add Header Image
    const headerImage = await getBase64("/images/header.png");
    doc.addImage(headerImage, "PNG", 10, 10, 190, 40);

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };
    
    // Add Title and Invoice Info
    doc.setFontSize(12);
    doc.text(`Customer Name: ${invoiceData.customerName}`, 14, 60);
    doc.text(`Invoice Number: ${invoiceData.invoiceNumber}`, 14, 70);
    // doc.text(`Date: ${invoiceData.date}`, 14, 80);
    doc.text(`Date: ${formatDate(invoiceData.date)}`, 14, 80);

    // Prepare table rows without images
    const tableRows = invoiceData.items.map((item, index) => [
      index + 1,
      "", // Placeholder for image
      item.description,
      item.quantity,
      invoiceData.fullAmount ? "" : (item.amount ? item.amount + " AED" : "0 AED"),
    ]);
  
    const options = {
      head: [["No", "Image", "Item Name & Description", "Quantity", "Amount"]],
      body: tableRows,
      startY: 90,
      headStyles: {
        fillColor: [0, 100, 0],
        halign: 'center',
        valign: 'middle',
        fontSize: 10,
      },
      bodyStyles: {
        minCellHeight: 30, // Increase height for rows
        halign: 'center',
        valign: 'middle',
      },
      didDrawCell: (data) => {
        if (data.column.index === 1 && data.row.section === 'body') {
          const item = invoiceData.items[data.row.index];
          if (item && item.image) {
            const imgWidth = 25; // Adjust this as needed
            const imgHeight = 25; // Adjust this as needed
            const xPosition = data.cell.x + 2;
            const yPosition = data.cell.y + 2;
            
            // Check if the current cell can fit the image
            if (data.cell.width >= imgWidth && data.cell.height >= imgHeight) {
              doc.addImage(item.image, "PNG", xPosition, yPosition, imgWidth, imgHeight);
            } else {
              // Handle case where image doesn't fit (could skip drawing or implement custom logic)
              console.warn("Image too large for current cell:", item.image);
            }
          }
        }
      },
      didDrawPage: (data) => {
        // Draw the header manually to avoid repeating
        doc.setFontSize(10);
        // doc.text("Invoice", 14, 20);
      },
    };
  
    // Check if the content fits the page and render it
    let pageHeight = doc.internal.pageSize.getHeight();
    let totalHeight = 90 + (tableRows.length * options.bodyStyles.minCellHeight);
  
    if (totalHeight > pageHeight) {
      // If it doesn't fit, split the items into multiple pages
      doc.autoTable({
        ...options,
        didDrawCell: (data) => {
          // Call the same didDrawCell logic to handle images
          if (data.column.index === 1 && data.row.section === 'body') {
            const item = invoiceData.items[data.row.index];
            if (item && item.image) {
              const imgWidth = 25; // Adjust width as needed
              const imgHeight = 25; // Adjust height as needed
              const xPosition = data.cell.x + 2;
              const yPosition = data.cell.y + 2;
              doc.addImage(item.image, "PNG", xPosition, yPosition, imgWidth, imgHeight);
            }
          }
        },
      });
    } else {
      // Render the table normally if it fits
      doc.autoTable(options);
    }

    // Calculate total amount
    const totalAmount = Number(invoiceData.totalAmount) || invoiceData.items.reduce((acc, item) => acc + Number(item.amount || 0), 0);
    const padding = 2;
    doc.setFillColor(0, 100, 0);
    const boxWidth = 50;
    const boxHeight = 10 + padding * 2;
    doc.rect(14, doc.lastAutoTable.finalY + 10, boxWidth, boxHeight, 'F');
    doc.setTextColor(255, 255, 255);
    const text = `Total Amount: ${totalAmount} AED`;
    const textWidth = doc.getTextWidth(text);
    const xPosition = 14 + (boxWidth - textWidth) / 2;
    const yPosition = doc.lastAutoTable.finalY + 10 + padding + (boxHeight - padding * 2) / 2;
    doc.text(text, xPosition, yPosition);

    // Add Footer Image
    const footerImage = await getBase64("/images/footer.png");
    doc.addImage(footerImage, "PNG", 10, doc.lastAutoTable.finalY + 30, 190, 50);

    // Download the PDF
    doc.save(`invoice_${invoiceData.invoiceNumber}.pdf`);
  };

  const getBase64 = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      };
      img.onerror = (error) => {
        console.error("Image loading error:", error);
        reject(error);
      };
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Invoice Generator</h2>
      <form className="space-y-4">
        <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
          <label className="w-full">
            Bill To:
            <input
              type="text"
              className="block w-full mt-1 p-2 border rounded"
              value={invoiceData.customerName}
              onChange={(e) => setInvoiceData({ ...invoiceData, customerName: e.target.value })}
            />
          </label>
          <label className="w-full">
            Invoice Number:
            <input
              type="text"
              className="block w-full mt-1 p-2 border rounded"
              value={invoiceData.invoiceNumber}
              onChange={(e) => setInvoiceData({ ...invoiceData, invoiceNumber: e.target.value })}
            />
          </label>
        </div>
        <label className="w-full">
          Date:
          <input
            type="date"
            className="block w-full mt-1 p-2 border rounded"
            value={invoiceData.date}
            onChange={(e) => setInvoiceData({ ...invoiceData, date: e.target.value })}
          />
        </label>

        <h3 className="text-xl font-semibold mt-6">Items</h3>
        {invoiceData.items.map((item, index) => (
          <div key={index} className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
            <input
              type="text"
              placeholder="Item Description"
              className="block w-full mt-1 p-2 border rounded"
              value={item.description}
              onChange={(e) => handleItemChange(index, "description", e.target.value)}
            />
            <input
              type="text"
              placeholder="Quantity"
              className="block w-full mt-1 p-2 border rounded"
              value={item.quantity}
              onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
            />
            <select
              className="block w-full mt-1 p-2 border rounded"
              onChange={(e) => {
                const selectedImage = localImages.find(img => img.name === e.target.value);
                handleItemChange(index, "image", selectedImage ? selectedImage.path : "");
                handleItemChange(index, "imageName", selectedImage ? selectedImage.name : "");
              }}
            >
              <option value="">Select Image</option>
              {localImages.map((img, idx) => (
                <option key={idx} value={img.name}>
                  {img.name}
                </option>
              ))}
            </select>
            {!invoiceData.fullAmount && (
              <input
                type="number"
                placeholder="Amount"
                className="block w-full mt-1 p-2 border rounded"
                value={item.amount}
                onChange={(e) => handleItemChange(index, "amount", e.target.value)}
              />
            )}
          </div>
        ))}

        <div className="mt-4">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              className="form-checkbox"
              checked={invoiceData.fullAmount}
              onChange={(e) => {
                setInvoiceData({ ...invoiceData, fullAmount: e.target.checked });
                if (e.target.checked) {
                  setInvoiceData(prevState => ({ ...prevState, totalAmount: "" }));
                }
              }}
            />
            <span className="ml-2">Full Amount</span>
          </label>
        </div>

        <div className="mt-4">
          <button
            type="button"
            className="bg-green-500 text-white py-2 px-4 rounded"
            onClick={addNewItem}
          >
            Add Item
          </button>
        </div>

        <div className="w-full mt-4">
          <label>
            Total Amount:
            <input
              type="number"
              className="block w-full mt-1 p-2 border rounded"
              value={invoiceData.totalAmount}
              onChange={(e) => setInvoiceData({ ...invoiceData, totalAmount: e.target.value })}
            />
          </label>
        </div>

      </form>

      <button
        type="button"
        className="bg-blue-500 text-white py-2 px-6 rounded mt-6"
        onClick={generatePDF}
      >
        Generate PDF
      </button>
    </div>
  );
};

export default InvoiceGenerator;
