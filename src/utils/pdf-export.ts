import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface ExportOptions {
  filename?: string
  quality?: number
  format?: 'a4' | 'letter' | 'legal'
  orientation?: 'portrait' | 'landscape'
}

export class PDFExporter {
  /**
   * Export an HTML element to PDF
   */
  static async exportElementToPDF(
    element: HTMLElement, 
    options: ExportOptions = {}
  ): Promise<void> {
    try {
      const {
        filename = 'document.pdf',
        quality = 1.0,
        format = 'a4',
        orientation = 'portrait'
      } = options

      // Create canvas from HTML element
      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      } as any)

      // Create PDF
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format
      })

      // Calculate dimensions
      const imgData = canvas.toDataURL('image/png')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      
      // Calculate image dimensions to fit the page
      const imgWidth = pdfWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      // Add image to PDF
      if (imgHeight <= pdfHeight) {
        // Image fits on one page
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      } else {
        // Image needs multiple pages
        let heightLeft = imgHeight
        let position = 0
        
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pdfHeight
        
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight
          pdf.addPage()
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
          heightLeft -= pdfHeight
        }
      }

      // Save the PDF
      pdf.save(filename)
      console.log('✅ PDF exported successfully:', filename)
      
    } catch (error) {
      console.error('❌ PDF Export Error:', error)
      throw new Error(`PDF export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Export the current page to PDF
   */
  static async exportPageToPDF(options: ExportOptions = {}): Promise<void> {
    const element = document.body
    return this.exportElementToPDF(element, options)
  }

  /**
   * Export a specific element by selector to PDF
   */
  static async exportSelectorToPDF(
    selector: string, 
    options: ExportOptions = {}
  ): Promise<void> {
    const element = document.querySelector(selector) as HTMLElement
    if (!element) {
      throw new Error(`Element with selector "${selector}" not found`)
    }
    return this.exportElementToPDF(element, options)
  }

  /**
   * Export text content to PDF
   */
  static async exportTextToPDF(
    text: string, 
    options: ExportOptions & { title?: string } = {}
  ): Promise<void> {
    try {
      const {
        filename = 'document.pdf',
        format = 'a4',
        orientation = 'portrait',
        title = 'Document'
      } = options

      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format
      })

      // Add title
      pdf.setFontSize(16)
      pdf.text(title, 20, 20)
      
      // Add content
      pdf.setFontSize(12)
      const splitText = pdf.splitTextToSize(text, 170) // 170mm width for A4
      pdf.text(splitText, 20, 30)

      pdf.save(filename)
      console.log('✅ Text PDF exported successfully:', filename)
      
    } catch (error) {
      console.error('❌ Text PDF Export Error:', error)
      throw new Error(`Text PDF export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Make it available globally for browser console usage (optional)
// Commented out due to TypeScript build issues - can be re-enabled if needed
/*
if (typeof window !== 'undefined') {
  (window as any).PDFExporter = PDFExporter
  (window as any).exportToPDF = () => PDFExporter.exportPageToPDF()
  console.log('🔧 PDF Exporter available globally: PDFExporter and exportToPDF()')
}
*/

export default PDFExporter