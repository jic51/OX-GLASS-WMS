// ════════════════════════════════════════════════════════════════════════════
//  ONE-OFF MIGRATION — v2 spreadsheet → v3 (MASTER_ARCHIVE_V3)
//
//  This already ran. It is kept for reference only and is NOT part of the app.
//  Do NOT paste it into the live Apps Script project: it is a global function,
//  which in a deployed web app means it is a callable endpoint, and it writes
//  to the archive without any authorization check of its own.
//
//  If it ever needs to run again, do it from a SEPARATE, undeployed Apps Script
//  project bound to a copy of the spreadsheet.
// ════════════════════════════════════════════════════════════════════════════

function migrateToV3_Corrected() {
  // PEGA AQUÍ LA URL DE TU NUEVO SPREADSHEET
  var NEW_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1wOGg_Xuf7DyabeS0L2iRb0MLtt7_QNWpZKqp9uP7dv4/edit?gid=0#gid=0/edit';

  var oldSs = SpreadsheetApp.getActiveSpreadsheet();
  var newSs = SpreadsheetApp.openByUrl(NEW_SPREADSHEET_URL);

  // Tu hoja vieja se llama "Master Archive" o similar
  var oldSheet = oldSs.getSheetByName('Master Archive')
    || oldSs.getSheetByName('Movements')
    || oldSs.getSheetByName('Sheet1')
    || oldSs.getSheets()[0];

  var newArchive = newSs.getSheetByName('MASTER_ARCHIVE_V3');
  if (!newArchive) throw new Error('MASTER_ARCHIVE_V3 no encontrado en el nuevo spreadsheet.');

  var oldData = oldSheet.getDataRange().getValues();
  var migratedCount = 0;
  var skippedCount = 0;

  Logger.log('Iniciando migración. Filas encontradas: ' + (oldData.length - 1));

  for (var i = 1; i < oldData.length; i++) {
    var row = oldData[i];

    // Saltar filas vacías
    if (!row[1] && !row[2]) {
      skippedCount++;
      continue;
    }

    // ─── MAPEO EXACTO 19 COLS → 21 COLS ───
    //
    // COLS ORIGINALES (índice 0-based):
    // 0:System Date | 1:Type | 2:Name | 3:GC | 4:Po# | 5:Qty | 6:Unit | 7:Date Received
    // 8:Loc | 9:Supplier | 10:Comments | 11:Status | 12:Responsible | 13:Project
    // 14:Mat ID | 15:Document link | 16:User | 17:Destination | 18:MoveType
    //
    // COLS NUEVAS (índice 0-based):
    // 0:Timestamp | 1:MoveType | 2:Category | 3:Name | 4:Project | 5:GC | 6:PO_Number
    // 7:Qty | 8:Unit | 9:Transaction_Date | 10:Source_Location | 11:Destination_Location
    // 12:Supplier | 13:Comments | 14:Status | 15:Responsible | 16:Material_ID
    // 17:Doc_Links | 18:User_Email | 19:Truck_Assignment | 20:Is_Generic

    var oldType = String(row[1] || '').toUpperCase().trim();        // Col B original
    var oldName = String(row[2] || '').trim();                      // Col C original
    var oldQty = Number(row[5] || 0);                               // Col F original
    var oldLoc = String(row[8] || '').trim();                       // Col I original
    var oldProject = String(row[13] || '').trim();                  // Col N original
    var oldMoveType = String(row[18] || '').toUpperCase().trim();   // Col S original
    var oldDest = String(row[17] || '').trim();                     // Col R original

    // Determinar MoveType correcto
    var moveType = oldMoveType;
    if (!moveType) {
      // Si MoveType está vacío, inferir del signo de Qty o del Type
      moveType = oldQty < 0 ? 'EXIT' : 'ENTRY';
    }
    // Limpiar typos comunes
    moveType = moveType.replace('DEPATCHED', 'DISPATCH').replace('DESPACHO', 'DISPATCH');
    if (['ENTRY', 'EXIT', 'TRANSFER', 'RETURN', 'DISPATCH', 'WASTE'].indexOf(moveType) === -1) {
      moveType = oldQty < 0 ? 'EXIT' : 'ENTRY';
    }

    // Qty siempre positiva en nueva estructura
    var absQty = Math.abs(oldQty);
    if (absQty === 0) {
      skippedCount++;
      continue; // Saltar filas con cantidad 0
    }

    // Determinar Source y Destination según MoveType
    var sourceLoc = '';
    var destLoc = '';

    if (moveType === 'ENTRY') {
      // ENTRY: Loc original = Destination (a dónde llegó)
      destLoc = oldLoc;
      sourceLoc = oldDest || ''; // Supplier location si existe
    } else if (moveType === 'EXIT') {
      // EXIT: Loc original = Source (de dónde salió)
      sourceLoc = oldLoc;
      destLoc = oldDest || oldProject || ''; // A dónde va (proyecto o destino)
    } else if (moveType === 'DISPATCH') {
      // DISPATCH: de Installer/Truck a Proyecto
      sourceLoc = oldLoc || 'WITH_INSTALLER';
      destLoc = oldDest || oldProject || '';
    } else if (moveType === 'TRANSFER') {
      // TRANSFER: Loc = Source, Destination = Dest
      sourceLoc = oldLoc;
      destLoc = oldDest || '';
    } else if (moveType === 'RETURN') {
      // RETURN: de Proyecto a Warehouse
      sourceLoc = oldProject || oldLoc || '';
      destLoc = oldDest || oldLoc || '';
    } else if (moveType === 'WASTE') {
      sourceLoc = oldLoc;
      destLoc = '';
    }

    // Determinar Project
    var project = oldProject || '';
    var isGeneric = false;
    if (!project || project === '' || project === 'GENERIC') {
      project = 'GENERIC';
      isGeneric = true;
    }

    // Construir Material_ID
    var materialId = (oldType + '|||' + oldName + '|||' + project).toUpperCase();

    // Construir nueva fila (21 columnas)
    var newRow = [
      row[0] || new Date(),           // A: Timestamp (System Date original)
      moveType,                        // B: MoveType (de Col S, o inferido)
      oldType,                         // C: Category (Type original)
      oldName,                         // D: Name
      project,                         // E: Project
      String(row[3] || ''),           // F: GC
      String(row[4] || ''),           // G: PO_Number
      absQty,                          // H: Qty (siempre positivo)
      String(row[6] || 'UNIT'),       // I: Unit
      formatDate(row[7]),             // J: Transaction_Date (Date Received)
      sourceLoc,                       // K: Source_Location
      destLoc,                         // L: Destination_Location
      String(row[9] || ''),           // M: Supplier
      String(row[10] || ''),          // N: Comments
      String(row[11] || 'In Stock'),  // O: Status
      String(row[12] || ''),          // P: Responsible
      materialId,                      // Q: Material_ID
      String(row[15] || ''),          // R: Doc_Links
      String(row[16] || 'Migration'), // S: User_Email
      '',                             // T: Truck_Assignment (vacío para datos viejos)
      isGeneric ? 'TRUE' : 'FALSE'    // U: Is_Generic
    ];

    newArchive.appendRow(newRow);
    migratedCount++;

    // Log cada 50 filas para seguimiento
    if (migratedCount % 50 === 0) {
      Logger.log('Progreso: ' + migratedCount + ' filas migradas...');
    }
  }

  Logger.log('=== MIGRACIÓN COMPLETADA ===');
  Logger.log('Filas migradas: ' + migratedCount);
  Logger.log('Filas saltadas (vacías o qty=0): ' + skippedCount);
  Logger.log('Total procesadas: ' + (oldData.length - 1));
}

function formatDate(dateVal) {
  if (!dateVal) return '';
  if (dateVal instanceof Date) {
    return Utilities.formatDate(dateVal, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(dateVal);
}
