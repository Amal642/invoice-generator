import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  fetchImages,
  uploadImageToStorage,
  saveImageToFirestore,
} from "./firebase";

const InvoiceGenerator = () => {
  const [invoiceData, setInvoiceData] = useState({
    customerName: "",
    invoiceNumber: "",
    date: new Date().toISOString().split("T")[0],
    items: [
      { description: "", quantity: "", amount: "", image: "", imageName: "" },
    ],
    fullAmount: true,
    totalAmount: "",
    comments: "", // Initialize comments state
  });
  const [images, setImages] = useState([]); // Store images fetched from Firestore
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageName, setImageName] = useState("");
  const [uploadStatus, setUploadStatus] = useState(null); // For alert box
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const getImages = async () => {
      const imagesData = await fetchImages(); // This should return an array of image objects from Firestore
      setImages(imagesData);
    };
    getImages();
  }, []); 

  const sanitizeFileName = (fileName) => {
    return fileName
      .replace(/\s+/g, "_") // Replace spaces with underscores
      .replace(/[^\w.-]/g, ""); // Remove special characters (keeping only alphanumeric, dot, and dash)
  };

  const handleImageUpload = async () => {
    if (selectedImage && imageName) {
      setIsLoading(true); // Start loading
      try {
        // Generate the file path (e.g., "images/imageName.png")
        const filePath = `images/${sanitizeFileName(imageName)}`;
  
        // Upload the image to Firebase Storage and get the public URL
        const imageUrl = await uploadImageToStorage(filePath, selectedImage);
  
        // Prepare the data to be saved in Firestore (e.g., image URL and name)
        const imageData = {
          name: imageName,
          path: imageUrl,
        };
  
        // Save the image details to Firestore
        await saveImageToFirestore(imageData);
  
        setUploadStatus({
          success: true,
          message: "Image uploaded and saved successfully!",
        });
        alert("Image uploaded successfully!"); // Alert on success
      } catch (error) {
        setUploadStatus({
          success: false,
          message: "Failed to upload image.",
        });
        alert("Failed to upload image."); // Alert on failure
        console.error("Error uploading image:", error);
      } finally {
        setIsLoading(false); // Stop loading
      }
    } else {
      alert("Please select an image and enter a name."); // Alert for missing fields
    }
  };
  
  const handleImageSelection = (e) => {
    setSelectedImage(e.target.files[0]);
  };

  const handleItemChange = async (index, key, value) => {
    const newItems = [...invoiceData.items];
    newItems[index][key] = value;

    // Load image if it's the 'imageName' being changed
    if (key === "imageName" && value) {
      const selectedImage = images.find((img) => img.name === value);
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
      items: [
        ...invoiceData.items,
        { description: "", quantity: "", amount: "", image: "", imageName: "" },
      ],
    });
  };

  const generatePDF = async () => {
    const doc = new jsPDF();

    // Add Header Image
    const headerImage = await getBase64("/imagesLocal/header.png");
    doc.addImage(headerImage, "PNG", 10, 10, 190, 40);

    // Format Date
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    // Add Title and Invoice Info
    doc.setFontSize(12);
    doc.text(`Customer Name: ${invoiceData.customerName}`, 14, 70);
    doc.text(`Invoice Number: ${invoiceData.invoiceNumber}`, 14, 60);
    doc.text(`Date: ${formatDate(invoiceData.date)}`, 160, 60);

    // Add comments in red color
    if (invoiceData.comments) {
      doc.setTextColor(255, 0, 0); // Set text color to red

      // Define the margin and calculate page width
      const margin = 14; // Set a margin for the text
      const pageWidth = doc.internal.pageSize.getWidth() - margin * 2; // Adjust for margins

      // Split the comments into lines that fit within the defined page width
      const lines = doc.splitTextToSize(invoiceData.comments, pageWidth);

      // Set the starting Y position for the text
      let startY = 80; // Adjust this as needed

      // Add each line of the comments to the PDF
      lines.forEach((line, index) => {
        doc.text(line, margin, startY + index * 5); // 10 is the line height, adjust as necessary
      });
    }

    // Prepare table rows without images
    const tableRows = invoiceData.items.map((item, index) => [
      index + 1,
      "", // Placeholder for image
      item.description,
      item.quantity,
      invoiceData.fullAmount
        ? ""
        : item.amount
        ? item.amount + " AED"
        : "0 AED",
    ]);

    const options = {
      head: [["No", "Image", "Item Name & Description", "Quantity", "Amount"]],
      body: tableRows,
      startY: 90,
      headStyles: {
        fillColor: [0, 100, 0],
        halign: "center",
        valign: "middle",
        fontSize: 10,
      },
      bodyStyles: {
        minCellHeight: 30, // Set row height
        halign: "center",
        valign: "middle",
      },
      didDrawCell: (data) => {
        // Draw images in the "Image" column
        if (data.column.index === 1 && data.row.section === "body") {
          const item = invoiceData.items[data.row.index];
          if (item && item.image) {
            let imgWidth = 25; // Default width
            let imgHeight = 25; // Default height
            const cellWidth = data.cell.width;
            const cellHeight = data.cell.height;

            // Adjust image size to fit the cell
            if (cellWidth < imgWidth || cellHeight < imgHeight) {
              const scalingFactor = Math.min(
                cellWidth / imgWidth,
                cellHeight / imgHeight
              );
              imgWidth *= scalingFactor;
              imgHeight *= scalingFactor;
            }

            const xPosition = data.cell.x + 2;
            const yPosition = data.cell.y + 2;

            // Add image in the cell
            doc.addImage(
              item.image,
              "PNG",
              xPosition,
              yPosition,
              imgWidth,
              imgHeight
            );
          }
        }
      },
    };

    // Render the table
    doc.autoTable(options);

    // Check the Y position after the table is rendered
    const finalY = doc.lastAutoTable.finalY;
    const pageHeight = doc.internal.pageSize.height;

    // Calculate total amount
    const totalAmount =
      Number(invoiceData.totalAmount) ||
      invoiceData.items.reduce(
        (acc, item) => acc + Number(item.amount || 0),
        0
      );
    const padding = 2;
    doc.setFillColor(0, 100, 0);
    const boxWidth = 50;
    const boxXPosition = 140;
    const boxHeight = 10 + padding * 2;
    doc.rect(boxXPosition, finalY + 10, boxWidth, boxHeight, "F");
    // doc.rect(14, finalY + 10, boxWidth, boxHeight, "F");
    doc.setTextColor(255, 255, 255);
    const text = `Total Amount: ${totalAmount} AED`;
    const textWidth = doc.getTextWidth(text);
    const xPosition = 14 + (boxWidth - textWidth) / 2;
    const yPosition = finalY + 10 + padding + (boxHeight - padding * 2) / 2;
    doc.text(text, boxXPosition + (boxWidth - textWidth) / 2, yPosition);
    // doc.text(text, xPosition, yPosition);

    // Ensure there is enough space for the footer image
    if (finalY + 60 > pageHeight) {
      // If not enough space, add a new page for the footer
      doc.addPage();
    }

    // Add Footer Image
    const footerImage = await getBase64("/imagesLocal/footer.png");
    doc.addImage(
      footerImage,
      "PNG",
      10,
      doc.internal.pageSize.height - 60,
      190,
      50
    );

    // Download the PDF
    doc.save(`invoice_${invoiceData.invoiceNumber}.pdf`);
  };

  const getBase64 = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL("image/png");
        resolve(dataURL);
      };
      img.onerror = (error) => {
        console.error("Image loading error:", error);
        reject(error);
      };
    });
  };

  return (
    <>
      <div className={`max-w-4xl mx-auto p-4 ${isLoading ? "blur" : ""}`}>
        <h2 className="text-2xl font-bold mb-6">Invoice Generator</h2>
        <form className="space-y-4">
          <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
            <label className="w-full">
              Bill To:
              <input
                type="text"
                className="block w-full mt-1 p-2 border rounded"
                value={invoiceData.customerName}
                onChange={(e) =>
                  setInvoiceData({
                    ...invoiceData,
                    customerName: e.target.value,
                  })
                }
              />
            </label>
            <label className="w-full">
              Invoice Number:
              <input
                type="text"
                className="block w-full mt-1 p-2 border rounded"
                value={invoiceData.invoiceNumber}
                onChange={(e) =>
                  setInvoiceData({
                    ...invoiceData,
                    invoiceNumber: e.target.value,
                  })
                }
              />
            </label>
          </div>
          <label className="w-full">
            Date:
            <input
              type="date"
              className="block w-full mt-1 p-2 border rounded"
              value={invoiceData.date}
              onChange={(e) =>
                setInvoiceData({ ...invoiceData, date: e.target.value })
              }
            />
          </label>
          <label className="w-full">
            Additional Comments:
            <textarea
              className="block w-full mt-1 p-2 border rounded"
              value={invoiceData.comments || ""}
              onChange={(e) =>
                setInvoiceData({ ...invoiceData, comments: e.target.value })
              }
            />
          </label>

          <h3 className="text-xl font-semibold mt-6">Items</h3>
          {invoiceData.items.map((item, index) => (
            <div
              key={index}
              className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4"
            >
              <input
                type="text"
                placeholder="Item Description"
                className="block w-full mt-1 p-2 border rounded"
                value={item.description}
                onChange={(e) =>
                  handleItemChange(index, "description", e.target.value)
                }
              />
              <input
                type="text"
                placeholder="Quantity"
                className="block w-full mt-1 p-2 border rounded"
                value={item.quantity}
                onChange={(e) =>
                  handleItemChange(index, "quantity", e.target.value)
                }
              />
              <select
                className="block w-full mt-1 p-2 border rounded"
                value={item.imageName}
            onChange={(e) => handleItemChange(index, "imageName", e.target.value)}
          >
            <option value="">Select Image</option>
            {images.map((img, idx) => (
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
                  onChange={(e) =>
                    handleItemChange(index, "amount", e.target.value)
                  }
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
                  setInvoiceData({
                    ...invoiceData,
                    fullAmount: e.target.checked,
                  });
                  if (e.target.checked) {
                    setInvoiceData((prevState) => ({
                      ...prevState,
                      totalAmount: "",
                    }));
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
                onChange={(e) =>
                  setInvoiceData({
                    ...invoiceData,
                    totalAmount: e.target.value,
                  })
                }
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
        <div className="mt-8">
          <h3 className="text-xl font-semibold">Upload Image</h3>
          <div className="mt-4 space-y-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelection}
              className="block w-full p-2 border rounded"
            />
            <input
              type="text"
              placeholder="Enter Image Name"
              value={imageName}
              onChange={(e) => setImageName(e.target.value)}
              className="block w-full p-2 border rounded"
            />
            <button
              type="button"
              className="bg-green-500 text-white py-2 px-4 rounded"
              onClick={handleImageUpload}
              disabled={isLoading}
            >
              {isLoading ? "Uploading..." : "Submit"}
            </button>
          </div>

          {uploadStatus && (
            <div
              className={`mt-4 p-4 rounded ${
                uploadStatus.success
                  ? "bg-green-200 text-green-800"
                  : "bg-red-200 text-red-800"
              }`}
            >
              {uploadStatus.message}
            </div>
          )}
        </div>
      </div>
      {/* Loading Spinner */}
      {isLoading && <div className="loading-spinner"></div>}
    </>
  );
};

export default InvoiceGenerator;
