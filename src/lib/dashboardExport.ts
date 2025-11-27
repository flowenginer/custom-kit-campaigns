import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export const exportToPDF = async (elementId: string, fileName: string = "dashboard.pdf") => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error("Elemento não encontrado");
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    logging: false,
    useCORS: true,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? "landscape" : "portrait",
    unit: "px",
    format: [canvas.width, canvas.height],
  });

  pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
  pdf.save(fileName);
};

export const exportToPNG = async (elementId: string, fileName: string = "dashboard.png") => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error("Elemento não encontrado");
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    logging: false,
    useCORS: true,
  });

  canvas.toBlob((blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    }
  });
};

export const exportToCSV = (data: any[], fileName: string = "dashboard-data.csv") => {
  if (!data || data.length === 0) {
    throw new Error("Sem dados para exportar");
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};
