"use strict";
var edaEsbuildExportName = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var src_exports = {};
  __export(src_exports, {
    about: () => about,
    activate: () => activate,
    batchPlaceFootprint: () => batchPlaceFootprint,
    batchPlaceSymbol: () => batchPlaceSymbol,
    openLibrarySelector: () => openLibrarySelector
  });
  function activate(status, arg) {
  }
  async function openLibrarySelector() {
    await eda.sys_IFrame.openIFrame("/iframe/library-selector.html", 400, 200);
  }
  async function getSelectedLibraryUuid() {
    try {
      const selectedLibraryType = await eda.sys_Storage.getExtensionUserConfig("selectedLibraryType");
      switch (selectedLibraryType) {
        case "personal":
          return await eda.lib_LibrariesList.getPersonalLibraryUuid();
        case "project":
          return await eda.lib_LibrariesList.getProjectLibraryUuid();
        case "other":
          const specificLibraryUuid = await eda.sys_Storage.getExtensionUserConfig("selectedSpecificLibraryUuid");
          if (specificLibraryUuid) {
            return specificLibraryUuid;
          }
          return await eda.lib_LibrariesList.getSystemLibraryUuid();
        case "system":
        default:
          return await eda.lib_LibrariesList.getSystemLibraryUuid();
      }
    } catch (error) {
      return await eda.lib_LibrariesList.getSystemLibraryUuid();
    }
  }
  async function batchPlaceSymbol() {
    const fileResult = await eda.sys_FileSystem.openReadFileDialog();
    if (!fileResult) {
      return;
    }
    let file;
    if (Array.isArray(fileResult)) {
      if (fileResult.length === 0) {
        return;
      }
      file = fileResult[0];
    } else {
      file = fileResult;
    }
    if (!file || typeof file.text !== "function") {
      return;
    }
    const csvContent = await file.text();
    await placeSymbolsFromCSV(csvContent);
  }
  async function batchPlaceFootprint() {
    const fileResult = await eda.sys_FileSystem.openReadFileDialog();
    if (!fileResult) {
      return;
    }
    let file;
    if (Array.isArray(fileResult)) {
      if (fileResult.length === 0) {
        return;
      }
      file = fileResult[0];
    } else {
      file = fileResult;
    }
    if (!file || typeof file.text !== "function") {
      return;
    }
    const csvContent = await file.text();
    await placeFootprintsFromCSV(csvContent);
  }
  function convertToMil(value, unit) {
    switch (unit.toLowerCase()) {
      case "mm":
        return value * 39.3701;
      // 1mm = 39.3701mil
      case "mil":
        return value;
      case "inch":
        return value * 1e3;
      // 1inch = 1000mil
      default:
        return value;
    }
  }
  function convertToInch(value, unit) {
    switch (unit.toLowerCase()) {
      case "mm":
        return value * 0.0393701;
      // 1mm = 0.0393701inch
      case "mil":
        return value * 1e-3;
      // 1mil = 0.001inch
      case "inch":
        return value;
      default:
        return value;
    }
  }
  function parseCSVWithCoordinates(csvContent, targetUnit = "mil") {
    const lines = csvContent.trim().split("\n");
    const components = [];
    let xUnit = "";
    let yUnit = "";
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const columns = line.split(",").map((col) => col.trim().replace(/"/g, ""));
      if (i === 0) {
        const firstColumn = columns[0].toLowerCase();
        if (firstColumn.includes("name") || firstColumn.includes("\u540D\u79F0") || firstColumn.includes("\u5C01\u88C5") || firstColumn.includes("component")) {
          if (columns.length >= 3) {
            const xHeader = columns[1].toLowerCase();
            if (xHeader.includes("mm")) xUnit = "mm";
            else if (xHeader.includes("mil")) xUnit = "mil";
            else if (xHeader.includes("inch")) xUnit = "inch";
            const yHeader = columns[2].toLowerCase();
            if (yHeader.includes("mm")) yUnit = "mm";
            else if (yHeader.includes("mil")) yUnit = "mil";
            else if (yHeader.includes("inch")) yUnit = "inch";
          }
          continue;
        }
      }
      if (columns.length >= 3) {
        const name = columns[0];
        const x = parseFloat(columns[1]);
        const y = parseFloat(columns[2]);
        if (!isNaN(x) && !isNaN(y)) {
          let convertedX, convertedY;
          if (targetUnit === "mil") {
            convertedX = convertToMil(x, xUnit);
            convertedY = convertToMil(y, yUnit);
          } else {
            convertedX = convertToInch(x, xUnit);
            convertedY = convertToInch(y, yUnit);
          }
          components.push({ name, x: convertedX, y: convertedY });
        }
      }
    }
    return components;
  }
  async function placeFootprintsFromCSV(csvContent) {
    const footprints = parseCSVWithCoordinates(csvContent, "mil");
    if (footprints.length === 0) {
      eda.sys_Dialog.showInformationMessage("CSV\u6587\u4EF6\u4E2D\u6CA1\u6709\u627E\u5230\u6709\u6548\u7684\u5C01\u88C5\u6570\u636E");
      return;
    }
    let successCount = 0;
    let failedCount = 0;
    const failedItems = [];
    try {
      eda.sys_Dialog.showInformationMessage(`\u627E\u5230 ${footprints.length} \u4E2A\u5C01\u88C5\uFF0C\u5F00\u59CB\u653E\u7F6E...`);
      for (let index = 0; index < footprints.length; index++) {
        const item = footprints[index];
        try {
          const libUuid = await getSelectedLibraryUuid();
          const footprintResult = await eda.lib_Footprint.search(item.name, libUuid);
          const deviceResult = await eda.lib_Device.search(item.name, libUuid);
          if (!footprintResult || footprintResult.length === 0) {
            failedCount++;
            failedItems.push(`${item.name}: \u672A\u627E\u5230\u5C01\u88C5`);
            continue;
          }
          if (!deviceResult || deviceResult.length === 0) {
            failedCount++;
            failedItems.push(`${item.name}: \u672A\u627E\u5230\u5668\u4EF6`);
            continue;
          }
          let selectedFootprint = null;
          let selectedDevice = null;
          for (const fp of footprintResult) {
            if (fp.name === item.name) {
              selectedFootprint = fp;
              break;
            }
          }
          if (!selectedFootprint) {
            failedCount++;
            failedItems.push(`${item.name}: \u5C01\u88C5\u540D\u79F0\u4E0D\u5B8C\u5168\u5339\u914D`);
            continue;
          }
          for (const dev of deviceResult) {
            if (dev.footprintName === item.name) {
              selectedDevice = dev;
              break;
            }
          }
          if (!selectedDevice) {
            failedCount++;
            failedItems.push(`${item.name}: \u5668\u4EF6\u5C01\u88C5\u540D\u79F0\u4E0D\u5B8C\u5168\u5339\u914D`);
            continue;
          }
          await eda.pcb_PrimitiveComponent.create(
            { libraryUuid: libUuid, uuid: selectedDevice.uuid },
            1,
            // EPCB_LayerId.TOP
            item.x,
            item.y
          );
          successCount++;
          if (index % 10 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
        } catch (error) {
          failedCount++;
          failedItems.push(`${item.name}: ${error.message}`);
        }
      }
      if (failedItems.length > 0) {
        eda.sys_Log.add(`\u6279\u91CF\u653E\u7F6E\u5931\u8D25\u8BE6\u60C5 (\u5171${failedItems.length}\u9879):`);
        failedItems.forEach((item) => {
          eda.sys_Log.add(`  ${item}`);
        });
      }
      eda.sys_Dialog.showInformationMessage(
        `\u6279\u91CF\u653E\u7F6E\u5B8C\u6210\uFF01\u6210\u529F: ${successCount}, \u5931\u8D25: ${failedCount}${failedItems.length > 0 ? "\n\n\u8BE6\u7EC6\u5931\u8D25\u4FE1\u606F\u8BF7\u67E5\u770B\u65E5\u5FD7\u9762\u677F" : ""}`
      );
    } catch (error) {
      eda.sys_Message.showToastMessage(`\u6279\u91CF\u653E\u7F6E\u8FC7\u7A0B\u4E2D\u53D1\u751F\u9519\u8BEF: ${error.message}`, "error");
    }
  }
  async function placeSymbolsFromCSV(csvContent) {
    const symbols = parseCSVWithCoordinates(csvContent, "inch");
    if (symbols.length === 0) {
      eda.sys_Dialog.showInformationMessage("CSV\u6587\u4EF6\u4E2D\u6CA1\u6709\u627E\u5230\u6709\u6548\u7684\u7B26\u53F7\u6570\u636E");
      return;
    }
    let successCount = 0;
    let failedCount = 0;
    const failedItems = [];
    try {
      eda.sys_Dialog.showInformationMessage(`\u627E\u5230 ${symbols.length} \u4E2A\u7B26\u53F7\uFF0C\u5F00\u59CB\u653E\u7F6E...`);
      for (let index = 0; index < symbols.length; index++) {
        const item = symbols[index];
        try {
          const libUuid = await getSelectedLibraryUuid();
          const symbolResult = await eda.lib_Symbol.search(item.name, libUuid);
          const deviceResult = await eda.lib_Device.search(item.name, libUuid);
          if (!symbolResult || symbolResult.length === 0) {
            failedCount++;
            failedItems.push(`${item.name}: \u672A\u627E\u5230\u7B26\u53F7`);
            continue;
          }
          if (!deviceResult || deviceResult.length === 0) {
            failedCount++;
            failedItems.push(`${item.name}: \u672A\u627E\u5230\u5668\u4EF6`);
            continue;
          }
          let selectedSymbol = null;
          let selectedDevice = null;
          for (const sym of symbolResult) {
            if (sym.name === item.name) {
              selectedSymbol = sym;
              break;
            }
          }
          if (!selectedSymbol) {
            failedCount++;
            failedItems.push(`${item.name}: \u7B26\u53F7\u540D\u79F0\u4E0D\u5B8C\u5168\u5339\u914D`);
            continue;
          }
          for (const dev of deviceResult) {
            if (dev.symbolName === item.name) {
              selectedDevice = dev;
              break;
            }
          }
          if (!selectedDevice) {
            failedCount++;
            failedItems.push(`${item.name}: \u5668\u4EF6\u7B26\u53F7\u540D\u79F0\u4E0D\u5B8C\u5168\u5339\u914D`);
            continue;
          }
          await eda.sch_PrimitiveComponent.create(
            { libraryUuid: libUuid, uuid: selectedDevice.uuid },
            item.x * 100,
            item.y * 100
          );
          successCount++;
          if (index % 10 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
        } catch (error) {
          failedCount++;
          failedItems.push(`${item.name}: ${error.message}`);
        }
      }
      if (failedItems.length > 0) {
        eda.sys_Log.add(`\u6279\u91CF\u653E\u7F6E\u7B26\u53F7\u5931\u8D25\u8BE6\u60C5 (\u5171${failedItems.length}\u9879):`);
        failedItems.forEach((item) => {
          eda.sys_Log.add(`  ${item}`);
        });
      }
      eda.sys_Dialog.showInformationMessage(
        `\u6279\u91CF\u653E\u7F6E\u7B26\u53F7\u5B8C\u6210\uFF01\u6210\u529F: ${successCount}, \u5931\u8D25: ${failedCount}${failedItems.length > 0 ? "\n\n\u8BE6\u7EC6\u5931\u8D25\u4FE1\u606F\u8BF7\u67E5\u770B\u65E5\u5FD7\u9762\u677F" : ""}`
      );
    } catch (error) {
      eda.sys_Message.showToastMessage(`\u6279\u91CF\u653E\u7F6E\u7B26\u53F7\u8FC7\u7A0B\u4E2D\u53D1\u751F\u9519\u8BEF: ${error.message}`, "error");
    }
  }
  function about() {
    eda.sys_Dialog.showInformationMessage(
      "\u6279\u91CF\u653E\u7F6E\u5143\u4EF6 v1.1.0\n\n\u652F\u6301CSV\u6587\u4EF6\u5BFC\u5165\u7684\u6279\u91CF\u653E\u7F6E\u5143\u4EF6\u5DE5\u5177\uFF0C\u5177\u5907\u667A\u80FD\u5355\u4F4D\u8F6C\u6362\u529F\u80FD\u3002\n\n\u529F\u80FD\uFF1A\n- \u6279\u91CF\u653E\u7F6EPCB\u5C01\u88C5\uFF08\u652F\u6301mm/mil\u5355\u4F4D\u81EA\u52A8\u8F6C\u6362\uFF09\n- \u6279\u91CF\u653E\u7F6E\u539F\u7406\u56FE\u7B26\u53F7\uFF08\u652F\u6301inch/mm\u5355\u4F4D\u81EA\u52A8\u8F6C\u6362\uFF09\n- \u667A\u80FD\u8BC6\u522BCSV\u8868\u5934\u4E2D\u7684\u5355\u4F4D\u4FE1\u606F\n- \u81EA\u52A8\u8FDB\u884C\u5355\u4F4D\u8F6C\u6362\u4EE5\u5339\u914DEDA\u5185\u90E8\u5750\u6807\u7CFB\u7EDF\n\nCSV\u683C\u5F0F\u793A\u4F8B\uFF1A\nName,X(mm),Y(mm)\n\u5143\u4EF6\u540D\u79F0,\u5750\u6807\u503C,\u5750\u6807\u503C"
    );
  }
  return __toCommonJS(src_exports);
})();
