declare module 'pdfmake/build/pdfmake' {
  const pdfMake: {
    vfs?: unknown;
    createPdf: (docDefinition: unknown) => { download: (filename?: string) => void };
  };
  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  const pdfFonts: {
    vfs?: unknown;
    pdfMake?: { vfs?: unknown };
  };
  export default pdfFonts;
}
