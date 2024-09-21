import React, { useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";

const InvoiceGenerator = () => {
  const [invoiceData, setInvoiceData] = useState({
    customerName: "",
    invoiceNumber: "",
    date: new Date().toISOString().split("T")[0],
    items: [{ description: "", quantity: "", amount: "", image: "", imageName: "" }],
    fullAmount: true,
    totalAmount: "",
  });

  const localImages = [
    { name: "Touch Switch Premium", path: "/images/touch_switch_premium.png" },
    { name: "Smart Thermostat", path: "/images/smart_thermostat.png" },
    { name: "20A Touch Switch for Heater", path: "/images/20A_Touch_Switch_for_Heater.png" },
    { name: "Smart Door bell", path: "/images/Smart_Door_Bell.png" },
    { name: "Alexa", path: "/images/Alexa.png" },
    { name: "Central control display", path: "/images/Central_control_display.png" },
    { name: "Smart Door Lock", path: "/images/Smart_Door_Lock.png" },
    { name: "Outdoor camera with solar panel", path: "/images/Outdoor_Camera.png" },
    { name: "Indoor camera", path: "/images/Indoor_camera.png" },
    { name: "Main Door Sensor", path: "/images/Main_Door_Sensor.png" },
    { name: "Geesmart Wireless Hub Device", path: "/images/Wireless_Hub_Device.png" },
    { name: "Motion Sensor", path: "/images/Motion_Sensor.png" },
    { name: "Data Socket", path: "/images/Data_Socket.png" },
    { name: "USB Socket", path: "/images/USB_Socket.png" },
    { name: "Zigbee Repeater", path: "/images/Zigbee_Repeater.png" },
    { name: "Garage Operator", path: "/images/Garage_Operator.png" },
    { name: "Bell Chime", path: "/images/Bell_chime.png" }
  ];

  const handleItemChange = (index, key, value) => {
    const newItems = [...invoiceData.items];
    newItems[index][key] = value;
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
  
    // Add Title and Invoice Info
    doc.setFontSize(12);
    doc.text(`Customer Name: ${invoiceData.customerName}`, 14, 60);
    doc.text(`Invoice Number: ${invoiceData.invoiceNumber}`, 14, 70);
    doc.text(`Date: ${invoiceData.date}`, 14, 80);
  
    // Prepare table rows without images (image will be added later in the cells)
    const tableRows = invoiceData.items.map((item, index) => [
      index + 1, // No
      "", // Empty string for image column (we will add image manually)
      item.description,
      item.quantity,
      invoiceData.fullAmount ? "" : item.amount+" AED",
    ]);
  
    // Render the table
    doc.autoTable({
      head: [["No", "Image", "Item Name & Description", "Quantity", "Amount"]],
      body: tableRows,
      startY: 90,
      headStyles: {
        fillColor: [0,100,0], // Light gray background for header
        halign: 'center', // Center align header
        valign: 'middle',
        fontSize: 10, // Font size for header (keeps it constant)
      },
      bodyStyles: {
        minCellHeight: 25, // Adjust the cell height for images
        halign: 'center',
        valign: 'middle', // Vertically center text in body cells
      },
      didDrawCell: async (data) => {
        // Draw image only in the "Image" column (index 1) for body rows (not header)
        if (data.column.index === 1 && data.row.section === 'body' && invoiceData.items[data.row.index].image) {
          const item = invoiceData.items[data.row.index];
          const img = await getBase64(item.image);
          const xPosition = data.cell.x + 2; // Small padding inside the cell
          const yPosition = data.cell.y + 2; // Small padding inside the cell
          const cellHeight = data.cell.height - 4; // Adjust for padding
          const cellWidth = data.cell.width - 4; // Adjust for padding
  
          // Add image inside the cell
          doc.addImage(img, "PNG", xPosition, yPosition, cellWidth, cellHeight);
        }
      }
    });
  
    // If Full Amount Selected
    
    const totalAmount = Number(invoiceData.totalAmount) || invoiceData.items.reduce((acc, item) => acc + Number(item.amount || 0), 0);

    // Set colors
    const padding = 2; // Adjust padding as needed

// Set colors
doc.setFillColor(0, 100, 0); // Dark green
const boxWidth = 50; // Width of the box
const boxHeight = 10 + padding * 2; // Height of the box with padding

// Draw rectangle (x, y, width, height, 'F' for fill)
doc.rect(14, doc.lastAutoTable.finalY + 10, boxWidth, boxHeight, 'F'); 

// Set text color
doc.setTextColor(255, 255, 255); // White text

// Calculate the position for the text
const text = `Total Amount: ${totalAmount} AED`;
const textWidth = doc.getTextWidth(text);
const xPosition = 14 + (boxWidth - textWidth) / 2; // Center the text horizontally
const yPosition = doc.lastAutoTable.finalY + 10 + padding + (boxHeight - padding * 2) / 2; // Center vertically

// Draw the text
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
