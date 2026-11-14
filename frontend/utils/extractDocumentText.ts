/**
 * Client-side text extraction utility for .txt and .pdf files.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "txt" || file.type === "text/plain") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || "");
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  if (extension === "pdf" || file.type === "application/pdf") {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjs = await import("pdfjs-dist");
      
      // Configure pdfjs worker if not already set
      if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version || "4.10.38"}/pdf.worker.min.mjs`;
      }

      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdf = await loadingTask.promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str || "")
          .join(" ");
        fullText += pageText + "\n";
      }

      const trimmed = fullText.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    } catch (err) {
      console.warn("[DocumentExtractor] pdfjs parsing encountered an issue, using fallback reader:", err);
    }

    // Binary stream fallback for PDFs
    const buffer = await file.arrayBuffer();
    const rawText = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    const cleaned = rawText
      .replace(/[^\x20-\x7E\n\r\t]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return cleaned.slice(0, 5000);
  }

  throw new Error("Unsupported file format. Please upload a .txt or .pdf file.");
}
