import { processExcelDataBase } from "../utils/tableUtils";

export function createPluginHandler({
    info,
    fieldMapping,
    scoreCalculator,
    validationRules,
}) {
    return {
        getInfo() {
            return info;
        },

        configureSection(config) {
            return {
                ...config,
                [`is${info.name.replace(/\s+/g, '')}`]: true,
            };
        },

        async processExcelData(workbook, tableCode, config, prodiName) {
            const { rawData, detectedIndices } = await processExcelDataBase(workbook, tableCode, config, prodiName);

            const filteredData = rawData.filter((row) => {
                if (!row || row.length === 0) return false;

                const nonEmpty = row.filter((val) => val !== undefined && val !== null && val !== "");
                if (nonEmpty.length <= 1) return false;

                const allNumbers = nonEmpty.every((val) =>
                    typeof val === "number" || (typeof val === "string" && !isNaN(val) && val.trim() !== "")
                );
                if (allNumbers) return false;

                const summaryLabels = ["jumlah", "total", "sum", "rata-rata", "average"];
                return !row.some((cell) => typeof cell === "string" && summaryLabels.includes(cell.toLowerCase().trim()));
            });

            const processed = filteredData.map((row, index) => {
                const item = { key: `excel-${index + 1}-${Date.now()}`, no: index + 1, selected: true };
                Object.entries(fieldMapping).forEach(([fieldName, columnIndex]) => {
                    if (columnIndex === undefined || columnIndex < 0) return;
                    const value = row[columnIndex];
                    item[fieldName] = typeof value === "object" ? String(value) : String(value ?? "").trim();
                });
                return item;
            });

            return {
                allRows: processed,
                shouldReplaceExisting: true,
            };
        },

        initializeData(config, prodiName, sectionCode, existingData = {}) {
            const initialData = {};
            config?.tables?.forEach((table) => {
                const tableCode = typeof table === "object" ? table.code : table;
                initialData[tableCode] = existingData[tableCode] ?? [];
            });
            return initialData;
        },

        async calculateScore(data, config, additionalData = {}) {
            return await scoreCalculator(data, config, additionalData);
        },

        normalizeData(data) {
            return data.map((item) => {
                const result = { ...item };
                Object.keys(fieldMapping).forEach((key) => {
                    result[key] = result[key] == null ? "" : String(result[key]);
                });
                return result;
            });
        },

        validateData(data) {
            const errors = [];

            data.forEach((item, index) => {
                validationRules.forEach(({ field, message }) => {
                    const value = item[field];
                    if (!value || String(value).trim() === "") {
                        errors.push(`Row ${index + 1}: ${message}`);
                    }
                });
            });

            return {
                valid: errors.length === 0,
                errors,
            };
        },

        prepareDataForSaving(data) {
            return data.map((item, index) => ({
                ...item,
                no: index + 1,
                _timestamp: Date.now(),
                selected: true,
            }));
        },
    };
}
