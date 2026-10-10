const fs = require('fs');
const PDFDocument = require('pdfkit');

const doc = new PDFDocument({ margin: 50 });
doc.pipe(fs.createWriteStream('Presentacion_Formal_Hackathon.pdf'));

// Título
doc.fontSize(20).font('Helvetica-Bold').text('Documento de Presentación: Almacén Inteligente', { align: 'center' });
doc.moveDown(1.5);

const sections = [
  {
    title: "1. Arquitectura y Libro Mayor (Base del Sistema)",
    content: "El núcleo del WMS es un Libro Mayor basado en Event Sourcing. Toda transacción en piso genera un evento inmutable, lo que garantiza idempotencia ante fallas de conectividad, tolerancia a alta concurrencia y la prevención matemática de inventarios negativos. El estado exacto del almacén es completamente reconstruible en cualquier punto del tiempo."
  },
  {
    title: "2. Experiencia en Piso (Operación Mobile-First y Poka-Yoke)",
    content: "La operación de piso se estructuró bajo un modelo Mobile-First de tres pasos secuenciales. Se integró un sistema Poka-Yoke que bloquea interacciones inválidas, exigiendo la validación de ubicación antes de mostrar las piezas disponibles. Adicionalmente, se incorporó Asistencia por Voz con Inteligencia Artificial, permitiendo al operario recibir estados e instrucciones auditivas en tiempo real para optimizar el enfoque en el manejo físico del inventario."
  },
  {
    title: "3. Integración con el Taller (Gestión de Órdenes)",
    content: "La gestión de kits fue automatizada en su totalidad. El sistema calcula los faltantes (shortages) en tiempo real al cruzar la lista de materiales (BOM) con los registros del Libro Mayor. Las órdenes se clasifican de manera dinámica en 'Disponibles' y 'Pendientes', eliminando la fricción y la incertidumbre en los procesos de surtido."
  },
  {
    title: "4. Inteligencia Artificial y Abastecimiento (Decisiones Justificadas)",
    content: "Para optimizar las órdenes pendientes, se integró el modelo de Inteligencia Artificial Gemini directamente en el flujo de decisiones. La IA evalúa los faltantes para determinar la viabilidad de transferencias internas o reparaciones, mitigando el riesgo de sobreinventario. En caso de requerir una orden de compra, el sistema activa un Mapeo Geoespacial de Proveedores que visualiza a los distribuidores en tiempo real, permitiendo la optimización logística y reducción de tiempos de entrega (Lead Times)."
  },
  {
    title: "5. Nivel Avanzado: Pronóstico y Finanzas",
    content: "El módulo analítico avanzado gestiona el capital inmovilizado mediante el cálculo de la Valuación a Costo Promedio. El panel de control aísla de forma automatizada las Piezas Críticas y el Dead Stock (inventario sin movimiento). Utilizando IA, el sistema genera un Pronóstico de Demanda fundamentado en inspecciones históricas, proporcionando una estrategia predictiva para la rotación de merma y el aseguramiento de la cadena de suministro."
  },
  {
    title: "6. Conclusión",
    content: "El producto desarrollado es un WMS de nivel industrial que cuenta con un motor de transacciones inmutable, una interfaz operativa a prueba de errores, asistencia auditiva, mapeo logístico geoespacial y análisis predictivo impulsado por Inteligencia Artificial para la erradicación del sobreinventario."
  }
];

sections.forEach(sec => {
  doc.fontSize(14).font('Helvetica-Bold').text(sec.title);
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica').text(sec.content, { align: 'justify' });
  doc.moveDown(1);
});

doc.end();
console.log('PDF Formal Generado.');
