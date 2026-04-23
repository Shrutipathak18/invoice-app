import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType
} from "docx";
import { saveAs } from "file-saver";

export const downloadInvoiceAsDocx = async (data) => {
  const tableRows = data.items.map((item, index) => {
    return new TableRow({
      children: [
        new TableCell({ children: [new Paragraph(String(index + 1))] }),
        new TableCell({ children: [new Paragraph(item.description || "-")] }),
        new TableCell({ children: [new Paragraph(item.hsnCode || "-")] }),
        new TableCell({ children: [new Paragraph(String(item.quantity))] }),
        new TableCell({ children: [new Paragraph(item.unit || "-")] }),
        new TableCell({ children: [new Paragraph(String(item.price))] }),
        new TableCell({ children: [new Paragraph(String(item.total))] }),
      ],
    });
  });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: data.companyName,
                bold: true,
                size: 32,
              }),
            ],
          }),

          new Paragraph(`Invoice No: ${data.invoiceNumber}`),
          new Paragraph(`Date: ${data.date}`),

          new Paragraph(" "),

          new Paragraph("Bill To:"),
          new Paragraph(data.billTo?.name || ""),
          new Paragraph(data.billTo?.address || ""),

          new Paragraph(" "),

          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              new TableRow({
                children: [
                  "S.No",
                  "Description",
                  "HSN",
                  "Qty",
                  "Unit",
                  "Price",
                  "Total",
                ].map(
                  (text) =>
                    new TableCell({
                      children: [new Paragraph({ text, bold: true })],
                    })
                ),
              }),
              ...tableRows,
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${data.invoiceNumber}.docx`);
};