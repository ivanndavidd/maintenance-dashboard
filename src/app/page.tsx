"use client";

import type React from "react";

import { useState, useCallback } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Plus,
  BarChart3,
  FileSpreadsheet,
  Trash2,
  Wrench,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import * as XLSX from "xlsx";

type CellValue = string | number | boolean | null;
type DataRow = CellValue[];
type DataTable = DataRow[];

interface CustomTooltipProps {
  active?: boolean;
  label?: string;
  payload?: { value: number }[];
}

interface ExcelData {
  headers: string[];
  rows: DataRow[];
  fileName: string;
}

interface ChartCard {
  id: string;
  name: string;
  type: "bar" | "pie" | "line";
  xColumn: string;
  yColumn?: string;
  groupColumn?: string;
  datasetId: 1 | 2;
}

const MAINTENANCE_PRESETS = [
  {
    name: "Status Distribution",
    type: "pie" as const,
    description: "Shows distribution of approval/status values",
  },
  {
    name: "Equipment Analysis",
    type: "bar" as const,
    description: "Analyzes equipment types or models",
  },
  {
    name: "Approval Workflow",
    type: "bar" as const,
    description: "Shows approver activity and workload",
  },
  {
    name: "Monthly Trends",
    type: "line" as const,
    description: "Time-based analysis of maintenance activities",
  },
];

interface MaintenanceDetail {
  itemName: string;
  records: DataRow[];
  headers: string[];
  datasetId: 1 | 2;
}

export default function MaintenanceDashboard() {
  const [excelData1, setExcelData1] = useState<ExcelData | null>(null);
  const [excelData2, setExcelData2] = useState<ExcelData | null>(null);

  const [chartCards1, setChartCards1] = useState<ChartCard[]>([]);
  const [chartCards2, setChartCards2] = useState<ChartCard[]>([]);

  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [activeDataset, setActiveDataset] = useState<1 | 2>(1);
  const [newCard, setNewCard] = useState({
    name: "",
    type: "bar" as "bar" | "pie" | "line",
    xColumn: "",
    yColumn: "",
    groupColumn: "",
  });
  const [maintenanceDetail, setMaintenanceDetail] =
    useState<MaintenanceDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const parseCSV = (text: string): string[][] => {
    const lines = text.split("\n").filter((line) => line.trim() !== "");
    const result: string[][] = [];

    for (const line of lines) {
      const row: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          row.push(current.trim().replace(/^"|"$/g, "")); // Remove surrounding quotes
          current = "";
        } else {
          current += char;
        }
      }

      row.push(current.trim().replace(/^"|"$/g, ""));
      result.push(row);
    }

    return result;
  };

  const detectMaintenanceColumns = (headers: string[]) => {
    const statusColumns = headers.filter(
      (h) =>
        h.toLowerCase().includes("status") ||
        h.toLowerCase().includes("approved") ||
        h.toLowerCase().includes("approval")
    );

    const equipmentColumns = headers.filter(
      (h) =>
        h.toLowerCase().includes("equipment") ||
        h.toLowerCase().includes("panel") ||
        h.toLowerCase().includes("model") ||
        h.toLowerCase().includes("type")
    );

    const approverColumns = headers.filter(
      (h) =>
        h.toLowerCase().includes("approver") ||
        h.toLowerCase().includes("approved by") ||
        h.toLowerCase().includes("bernard") ||
        h.toLowerCase().includes("iskandar")
    );

    return { statusColumns, equipmentColumns, approverColumns };
  };

  // const getMaintenanceDetails = (itemName: string, card: ChartCard) => {
  //   const excelData = card.datasetId === 1 ? excelData1 : excelData2;
  //   if (!excelData) return [];

  //   const xIndex = excelData.headers.indexOf(card.xColumn);
  //   if (xIndex === -1) return [];

  //   // Filter rows that match the selected item
  //   const matchingRows = excelData.rows.filter((row) => {
  //     const xValue = row[xIndex]?.toString() || "";
  //     return xValue === itemName;
  //   });

  //   return matchingRows;
  // };

  const getMaintenanceDetails = (itemName: string, card: ChartCard) => {
    const excelData = card.datasetId === 1 ? excelData1 : excelData2;
    if (!excelData) return [];

    const xIndex = excelData.headers.indexOf(card.xColumn);
    if (xIndex === -1) return [];

    if (!excelData.rows) return [];

    // Filter rows that match the selected item
    const matchingRows = excelData.rows.filter((row) => {
      if (xIndex < 0 || xIndex >= row.length) return false; // extra safety
      const cell = row[xIndex];
      const xValue = cell != null ? String(cell) : "";
      return xValue === itemName;
    });

    return matchingRows;
  };

  const handleDataValueClick = (itemName: string, card: ChartCard) => {
    const excelData = card.datasetId === 1 ? excelData1 : excelData2;
    if (!excelData) return;

    const records = getMaintenanceDetails(itemName, card);

    setMaintenanceDetail({
      itemName,
      records,
      headers: excelData.headers,
      datasetId: card.datasetId,
    });
    setIsDetailOpen(true);
  };

  const createDefaultCharts = (excelData: ExcelData, datasetId: 1 | 2) => {
    const fileName = excelData.fileName.toLowerCase();
    const headers = excelData.headers;

    // Helper function to find column with flexible matching
    const findColumn = (searchTerms: string[]) => {
      for (const term of searchTerms) {
        const found = headers.find((h) =>
          h.toLowerCase().includes(term.toLowerCase())
        );
        if (found) return found;
      }
      return null;
    };

    const defaultCharts: ChartCard[] = [];

    if (fileName.includes("parts usage")) {
      // Create "Cost Part" bar chart using "Total Price Part 1" classified by "Part Model 1"
      const priceColumn = findColumn([
        "Total Price Part 1",
        "total price",
        "price",
        "cost",
      ]);
      const modelColumn = findColumn(["Area Usage", "model", "equipment"]);

      if (priceColumn && modelColumn) {
        defaultCharts.push({
          id: `default-cost-${Date.now()}`,
          name: "Cost Part",
          type: "bar",
          xColumn: modelColumn,
          yColumn: priceColumn,
          groupColumn: "",
          datasetId,
        });
      }
    } else if (fileName.includes("preventive maintenance report")) {
      // Create "Time Consume" chart from "Total Minutes" classified by "Preventive maintenance part"
      const minutesColumn = findColumn([
        "Total Minutes",
        "minutes",
        "time",
        "duration",
      ]);
      const partColumn = findColumn([
        "Preventive maintenance part",
        "maintenance part",
        "part",
        "component",
      ]);

      if (minutesColumn && partColumn) {
        defaultCharts.push({
          id: `default-time-${Date.now()}`,
          name: "Time Consume",
          type: "bar",
          xColumn: partColumn,
          yColumn: minutesColumn,
          groupColumn: "",
          datasetId,
        });
      }

      // Create "Activity" chart classified by "Type Activity"
      const activityColumn = findColumn([
        "Type Activity",
        "activity type",
        "activity",
        "type",
      ]);

      if (activityColumn) {
        defaultCharts.push({
          id: `default-activity-${Date.now()}`,
          name: "Activity",
          type: "pie",
          xColumn: activityColumn,
          yColumn: "",
          groupColumn: "",
          datasetId,
        });
      }
    }

    // Add the default charts to the appropriate dataset
    if (defaultCharts.length > 0) {
      if (datasetId === 1) {
        setChartCards1((prev) => [...prev, ...defaultCharts]);
      } else {
        setChartCards2((prev) => [...prev, ...defaultCharts]);
      }
    }
  };

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>, datasetId: 1 | 2) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const fileExtension = file.name.toLowerCase().split(".").pop();
      const reader = new FileReader();

      if (fileExtension === "csv") {
        reader.onload = (e) => {
          try {
            const text = e.target?.result as string;
            const jsonData = parseCSV(text); // returns DataTable

            if (jsonData.length > 0) {
              const headers = jsonData[0] as string[];
              const headerCount = headers.length;

              const rows: DataTable = jsonData.slice(1).map((row) => {
                const normalizedRow: DataRow = [...row];
                while (normalizedRow.length < headerCount) {
                  normalizedRow.push("");
                }
                return normalizedRow.slice(0, headerCount);
              });

              const newExcelData = {
                headers,
                rows,
                fileName: file.name,
              };

              if (datasetId === 1) {
                setExcelData1(newExcelData);
                setChartCards1([]);
              } else {
                setExcelData2(newExcelData);
                setChartCards2([]);
              }

              setTimeout(
                () => createDefaultCharts(newExcelData, datasetId),
                100
              );
            }
          } catch (error) {
            console.error("Error reading CSV file:", error);
          }
        };
        reader.readAsText(file);
      } else {
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
              header: 1,
              defval: "",
              raw: false,
            }) as DataTable;

            if (jsonData.length > 0) {
              const headers = jsonData[0] as string[];
              const headerCount = headers.length;

              const rows: DataTable = jsonData.slice(1).map((row) => {
                const normalizedRow: DataRow = [...row];
                while (normalizedRow.length < headerCount) {
                  normalizedRow.push("");
                }
                return normalizedRow.slice(0, headerCount);
              });

              const newExcelData = {
                headers,
                rows,
                fileName: file.name,
              };

              if (datasetId === 1) {
                setExcelData1(newExcelData);
                setChartCards1([]);
              } else {
                setExcelData2(newExcelData);
                setChartCards2([]);
              }

              setTimeout(
                () => createDefaultCharts(newExcelData, datasetId),
                100
              );
            }
          } catch (error) {
            console.error("Error reading Excel file:", error);
          }
        };
        reader.readAsArrayBuffer(file);
      }
    },
    []
  );

  const addPresetChart = (
    preset: (typeof MAINTENANCE_PRESETS)[0],
    datasetId: 1 | 2
  ) => {
    const excelData = datasetId === 1 ? excelData1 : excelData2;
    if (!excelData) return;

    const { statusColumns, equipmentColumns, approverColumns } =
      detectMaintenanceColumns(excelData.headers);

    let xColumn = "";

    switch (preset.name) {
      case "Status Distribution":
        xColumn =
          statusColumns[0] ||
          excelData.headers.find((h) => h.toLowerCase().includes("status")) ||
          excelData.headers[0];
        break;
      case "Equipment Analysis":
        xColumn =
          equipmentColumns[0] ||
          excelData.headers.find((h) =>
            h.toLowerCase().includes("equipment")
          ) ||
          excelData.headers[1];
        break;
      case "Approval Workflow":
        xColumn =
          approverColumns[0] ||
          excelData.headers.find((h) => h.toLowerCase().includes("approved")) ||
          excelData.headers[0];
        break;
      case "Monthly Trends":
        xColumn =
          excelData.headers.find(
            (h) =>
              h.toLowerCase().includes("date") ||
              h.toLowerCase().includes("time")
          ) || excelData.headers[0];
        break;
      default:
        xColumn = excelData.headers[0];
    }

    const card: ChartCard = {
      id: Date.now().toString(),
      name: preset.name,
      type: preset.type,
      xColumn,
      yColumn: "",
      groupColumn: "",
      datasetId,
    };

    if (datasetId === 1) {
      setChartCards1([...chartCards1, card]);
    } else {
      setChartCards2([...chartCards2, card]);
    }
  };

  const addChartCard = () => {
    if (!newCard.name || !newCard.xColumn) return;

    const card: ChartCard = {
      id: Date.now().toString(),
      name: newCard.name,
      type: newCard.type,
      xColumn: newCard.xColumn,
      yColumn: newCard.yColumn || "",
      groupColumn: newCard.groupColumn || "",
      datasetId: activeDataset,
    };

    if (activeDataset === 1) {
      setChartCards1([...chartCards1, card]);
    } else {
      setChartCards2([...chartCards2, card]);
    }

    setNewCard({
      name: "",
      type: "bar",
      xColumn: "",
      yColumn: "",
      groupColumn: "",
    });
    setIsAddCardOpen(false);
  };

  const removeChartCard = (id: string, datasetId: 1 | 2) => {
    if (datasetId === 1) {
      setChartCards1(chartCards1.filter((card) => card.id !== id));
    } else {
      setChartCards2(chartCards2.filter((card) => card.id !== id));
    }
  };

  const getChartData = (card: ChartCard) => {
    const excelData = card.datasetId === 1 ? excelData1 : excelData2;
    if (!excelData) return [];

    const xIndex = excelData.headers.indexOf(card.xColumn);
    const yIndex = card.yColumn ? excelData.headers.indexOf(card.yColumn) : -1;

    const fileName = excelData.fileName.toLowerCase();
    let dateColumnIndex = -1;

    if (fileName.includes("preventive maintenance report")) {
      dateColumnIndex = excelData.headers.findIndex(
        (h) =>
          h.toLowerCase().includes("start time") ||
          h.toLowerCase().includes("starttime")
      );
    } else if (fileName.includes("parts usage")) {
      dateColumnIndex = excelData.headers.findIndex((h) =>
        h.toLowerCase().includes("created")
      );
    }

    if (xIndex === -1) return [];

    const dataMap = new Map();

    excelData.rows.forEach((row) => {
      const xValue = row[xIndex]?.toString() || "Unknown";

      if (!xValue || xValue.trim() === "" || xValue === "Unknown") return;

      const dateValue =
        dateColumnIndex !== -1 ? row[dateColumnIndex]?.toString() : null;
      const parsedDate = dateValue ? new Date(dateValue) : null;

      if (yIndex !== -1 && card.yColumn) {
        const yValue = row[yIndex];
        let numericValue = 0;

        if (yValue !== null && yValue !== undefined && yValue !== "") {
          const cleanValue = yValue
            .toString()
            .replace(/[^\d.-]/g, "")
            .replace(/,/g, "");

          numericValue = Number.parseFloat(cleanValue);

          if (isNaN(numericValue)) {
            numericValue = 1;
          }
        }

        if (dataMap.has(xValue)) {
          const existing = dataMap.get(xValue);
          dataMap.set(xValue, {
            value: existing.value + numericValue,
            dates:
              parsedDate && !isNaN(parsedDate.getTime())
                ? [...existing.dates, parsedDate]
                : existing.dates,
          });
        } else {
          dataMap.set(xValue, {
            value: numericValue,
            dates:
              parsedDate && !isNaN(parsedDate.getTime()) ? [parsedDate] : [],
          });
        }
      } else {
        if (dataMap.has(xValue)) {
          const existing = dataMap.get(xValue);
          dataMap.set(xValue, {
            value: existing.value + 1,
            dates:
              parsedDate && !isNaN(parsedDate.getTime())
                ? [...existing.dates, parsedDate]
                : existing.dates,
          });
        } else {
          dataMap.set(xValue, {
            value: 1,
            dates:
              parsedDate && !isNaN(parsedDate.getTime()) ? [parsedDate] : [],
          });
        }
      }
    });

    return Array.from(dataMap.entries())
      .map(([name, data]) => {
        let dateRange = "";
        if (data.dates.length > 0) {
          const sortedDates = data.dates.sort(
            (a: Date, b: Date) => a.getTime() - b.getTime()
          );
          const earliestDate = sortedDates[0];
          const latestDate = sortedDates[sortedDates.length - 1];

          const formatDate = (date: Date) => {
            return date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
          };

          if (earliestDate.getTime() === latestDate.getTime()) {
            dateRange = formatDate(earliestDate);
          } else {
            dateRange = `${formatDate(earliestDate)} - ${formatDate(
              latestDate
            )}`;
          }
        }

        return {
          name,
          value: Number(data.value),
          dateRange,
        };
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  };
  // const getChartData = (card: ChartCard) => {
  //   const excelData = card.datasetId === 1 ? excelData1 : excelData2;
  //   if (!excelData) return [];

  //   const xIndex = excelData.headers.indexOf(card.xColumn);
  //   const yIndex = card.yColumn ? excelData.headers.indexOf(card.yColumn) : -1;

  //   if (xIndex === -1) return [];

  //   const dataMap = new Map();

  //   excelData.rows.forEach((row) => {
  //     const xValue = row[xIndex]?.toString() || "Unknown";

  //     if (!xValue || xValue.trim() === "" || xValue === "Unknown") return;

  //     if (yIndex !== -1 && card.yColumn) {
  //       const yValue = row[yIndex];
  //       let numericValue = 0;

  //       if (yValue !== null && yValue !== undefined && yValue !== "") {
  //         // Convert to string and clean up the value
  //         const cleanValue = yValue
  //           .toString()
  //           .replace(/[^\d.-]/g, "") // Remove all non-numeric characters except dots and dashes
  //           .replace(/,/g, ""); // Remove commas

  //         numericValue = Number.parseFloat(cleanValue);

  //         // If still not a valid number, treat as count
  //         if (isNaN(numericValue)) {
  //           numericValue = 1;
  //         }
  //       }

  //       if (dataMap.has(xValue)) {
  //         dataMap.set(xValue, dataMap.get(xValue) + numericValue);
  //       } else {
  //         dataMap.set(xValue, numericValue);
  //       }
  //     } else {
  //       if (dataMap.has(xValue)) {
  //         dataMap.set(xValue, dataMap.get(xValue) + 1);
  //       } else {
  //         dataMap.set(xValue, 1);
  //       }
  //     }
  //   });

  //   return Array.from(dataMap.entries())
  //     .map(([name, value]) => ({
  //       name,
  //       value: Number(value),
  //     }))
  //     .filter((item) => item.value > 0) // Remove zero values
  //     .sort((a, b) => b.value - a.value); // Sort by value descending
  // };

  const COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
  ];

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-blue-600">
            value: {formatNumber(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderUploadSection = (
    datasetId: 1 | 2,
    excelData: ExcelData | null
  ) => (
    <Card className="flex-1">
      <CardHeader className="text-center">
        <CardTitle className="text-center">
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-6 w-6 text-blue-600" />
            Upload Maintenance Data {datasetId}
          </div>
        </CardTitle>
        <CardDescription className="text-center">
          {excelData
            ? `Loaded: ${excelData.fileName}`
            : `Upload Excel (.xlsx, .xls) or CSV file ${datasetId} with maintenance workflow data`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border-2 border-dashed border-blue-400 rounded-lg p-8 min-h-[200px] flex flex-col items-center justify-center">
          <Input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => handleFileUpload(e, datasetId)}
            className="hidden"
            id={`excel-upload-${datasetId}`}
          />

          <Label
            htmlFor={`excel-upload-${datasetId}`}
            className="cursor-pointer"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-blue-50 rounded-full">
                <FileSpreadsheet className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-gray-900">
                  {excelData ? "Replace File" : "Choose Maintenance File"}
                </p>
                <p className="text-sm text-gray-500">
                  Excel/CSV with work items, approvals, equipment data
                </p>
              </div>
              <Button
                type="button"
                className="mt-2 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(`excel-upload-${datasetId}`)?.click();
                }}
              >
                Browse Files
              </Button>
            </div>
          </Label>
        </div>
      </CardContent>
    </Card>
  );

  const renderChartSection = (
    datasetId: 1 | 2,
    excelData: ExcelData | null,
    chartCards: ChartCard[]
  ) => {
    if (!excelData) return null;

    return (
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Dataset {datasetId} Analytics
              </CardTitle>
              <CardDescription>
                Maintenance insights for {excelData.fileName}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 bg-transparent"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Quick Charts
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Maintenance Chart Templates</DialogTitle>
                    <DialogDescription>
                      Choose from common maintenance analysis charts
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 gap-3">
                    {MAINTENANCE_PRESETS.map((preset) => (
                      <Button
                        key={preset.name}
                        variant="outline"
                        className="justify-start h-auto p-4 bg-transparent"
                        onClick={() => addPresetChart(preset, datasetId)}
                      >
                        <div className="text-left">
                          <div className="font-medium">{preset.name}</div>
                          <div className="text-sm text-gray-500">
                            {preset.description}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog
                open={isAddCardOpen && activeDataset === datasetId}
                onOpenChange={(open) => {
                  setIsAddCardOpen(open);
                  if (open) setActiveDataset(datasetId);
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    className="flex items-center gap-2"
                    onClick={() => setActiveDataset(datasetId)}
                  >
                    <Plus className="h-4 w-4" />
                    Custom Chart
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      Custom Chart for Dataset {datasetId}
                    </DialogTitle>
                    <DialogDescription>
                      Create custom visualization from {excelData.fileName}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label
                        htmlFor="card-name"
                        className="flex items-center gap-1 mb-1"
                      >
                        Chart Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="card-name"
                        className="mb-4"
                        value={newCard.name}
                        onChange={(e) =>
                          setNewCard({ ...newCard, name: e.target.value })
                        }
                        placeholder="Example: Equipment Failure Analysis"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="chart-type"
                        className="flex items-center gap-1 mb-1"
                      >
                        Chart Type <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={newCard.type}
                        onValueChange={(value: "bar" | "pie" | "line") =>
                          setNewCard({ ...newCard, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bar">Bar Chart</SelectItem>
                          <SelectItem value="pie">Pie Chart</SelectItem>
                          <SelectItem value="line">Line Chart</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label
                        htmlFor="x-column"
                        className="flex items-center gap-1 mb-1"
                      >
                        Column X (Categorical){" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={newCard.xColumn}
                        onValueChange={(value) =>
                          setNewCard({ ...newCard, xColumn: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {excelData.headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label
                        htmlFor="y-column"
                        className="flex items-center gap-1 mb-1"
                      >
                        Column Y (Value) <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={newCard.yColumn || "count"}
                        onValueChange={(value) =>
                          setNewCard({
                            ...newCard,
                            yColumn: value === "count" ? "" : value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select column or leave for count" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="count">Count</SelectItem>
                          {excelData.headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={addChartCard} className="w-full">
                      Add Chart
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 xl:grid-cols-2 lg:grid-cols-1 gap-4">
            {chartCards.map((card) => {
              const chartData = getChartData(card);
              return (
                <Card key={card.id} className="border border-gray-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <BarChart3 className="h-4 w-4" />
                        {card.name}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeChartCard(card.id, datasetId)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardDescription className="text-xs">
                      {card.type === "bar"
                        ? "Bar Chart"
                        : card.type === "pie"
                        ? "Pie Chart"
                        : "Line Chart"}{" "}
                      - {card.xColumn}
                      {card.yColumn && ` vs ${card.yColumn}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full">
                      <div className="h-64 w-full">
                        {card.type === "bar" ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={chartData}
                              margin={{
                                top: 20,
                                right: 30,
                                left: 20,
                                bottom: 80,
                              }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="name"
                                angle={chartData.length > 8 ? -45 : 0}
                                textAnchor={
                                  chartData.length > 8 ? "end" : "middle"
                                }
                                height={chartData.length > 8 ? 100 : 10}
                                interval={0}
                                tick={{ fontSize: 12 }}
                              />
                              <YAxis tickFormatter={formatNumber} />
                              <Tooltip content={<CustomTooltip />} />
                              <Bar dataKey="value" fill="#3b82f6" />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : card.type === "line" ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={chartData}
                              margin={{
                                top: 20,
                                right: 30,
                                left: 20,
                                bottom: 80,
                              }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="name"
                                angle={chartData.length > 8 ? -45 : 0}
                                textAnchor={
                                  chartData.length > 8 ? "end" : "middle"
                                }
                                height={chartData.length > 8 ? 100 : 60}
                                interval={0}
                                tick={{ fontSize: 12 }}
                              />
                              <YAxis tickFormatter={formatNumber} />
                              <Tooltip content={<CustomTooltip />} />
                              <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#3b82f6"
                                strokeWidth={2}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <ResponsiveContainer width="100%" height={400}>
                            <PieChart
                              margin={{
                                top: 20,
                                right: 30,
                                left: 20,
                                bottom: 20,
                              }}
                            >
                              <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent = 0 }) =>
                                  `${name} ${(percent * 100).toFixed(0)}%`
                                }
                                innerRadius="40%" // opsional, biar jadi donut
                                outerRadius={100} // responsive, mengikuti container
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {chartData.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                  />
                                ))}
                              </Pie>
                              <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                    {chartData.length > 5 && (
                      <div className="mt-4 border-t pt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Data Values
                        </h4>
                        <div className="max-h-32 overflow-y-auto">
                          <Table>
                            <TableHeader className="bg-gray-300">
                              <TableRow>
                                <TableHead className="text-xs">
                                  {card.xColumn}
                                </TableHead>
                                <TableHead className="text-xs">
                                  {card.yColumn || "Count"}
                                </TableHead>
                                <TableHead className="text-xs">
                                  Date Range
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {chartData.map((item, index) => (
                                <TableRow
                                  key={index}
                                  className="cursor-pointer hover:bg-gray-50"
                                  onClick={() =>
                                    handleDataValueClick(item.name, card)
                                  }
                                >
                                  <TableCell
                                    className="text-xs truncate max-w-[150px]"
                                    title={item.name}
                                  >
                                    {item.name}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {formatNumber(item.value)}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {item.dateRange}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {chartCards.length === 0 && (
            <div className="text-center py-8">
              <Wrench className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                No charts yet
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Add maintenance analytics to visualize this dataset
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const preset = MAINTENANCE_PRESETS[0];
                    addPresetChart(preset, datasetId);
                  }}
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Quick Chart
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setActiveDataset(datasetId);
                    setIsAddCardOpen(true);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Custom Chart
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Image
                src="/assets/blibli.svg"
                alt="Dashboard Logo"
                className="h-8 w-8"
                width={32}
                height={32}
              />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Maintenance Analytics Dashboard
                </h1>
                <p className="text-sm text-gray-500">
                  Analyze maintenance workflows, approvals, and equipment data
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {excelData1 && (
                <Badge variant="secondary" className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Dataset 1: {excelData1.fileName}
                </Badge>
              )}
              {excelData2 && (
                <Badge variant="outline" className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Dataset 2: {excelData2.fileName}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {!excelData1 && !excelData2 ? (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Upload Your Maintenance Data
              </h2>
              <p className="text-gray-600">
                Upload Excel or CSV files containing work items, approvals,
                equipment data, and maintenance workflows
              </p>
            </div>
            <div className="flex flex-col lg:flex-row gap-6">
              {renderUploadSection(1, excelData1)}
              {renderUploadSection(2, excelData2)}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col lg:flex-row gap-6">
              {renderUploadSection(1, excelData1)}
              {renderUploadSection(2, excelData2)}
            </div>

            {excelData1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Dataset 1 Preview - {excelData1.fileName}
                  </CardTitle>
                  <CardDescription>
                    Showing first 5 rows from {excelData1.rows.length} total
                    maintenance records
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {excelData1.headers.map((header, index) => (
                            <TableHead
                              key={index}
                              className="font-semibold min-w-[120px]"
                            >
                              {header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {excelData1.rows.slice(0, 5).map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <TableCell
                                key={cellIndex}
                                className="max-w-[200px] truncate"
                                title={cell?.toString()}
                              >
                                {cell?.toString() || "-"}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {excelData2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Dataset 2 Preview - {excelData2.fileName}
                  </CardTitle>
                  <CardDescription>
                    Showing first 5 rows from {excelData2.rows.length} total
                    maintenance records
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {excelData2.headers.map((header, index) => (
                            <TableHead
                              key={index}
                              className="font-semibold min-w-[120px]"
                            >
                              {header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {excelData2.rows.slice(0, 5).map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <TableCell
                                key={cellIndex}
                                className="max-w-[200px] truncate"
                                title={cell?.toString()}
                              >
                                {cell?.toString() || "-"}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-6">
              {renderChartSection(1, excelData1, chartCards1)}
              {renderChartSection(2, excelData2, chartCards2)}
            </div>
          </div>
        )}
      </div>
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Maintenance Details: {maintenanceDetail?.itemName}
            </DialogTitle>
            <DialogDescription>
              Showing {maintenanceDetail?.records.length} maintenance record(s)
              for this item from Dataset {maintenanceDetail?.datasetId}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh]">
            {maintenanceDetail && (
              <Table>
                <TableHeader>
                  <TableRow>
                    {maintenanceDetail.headers.map((header, index) => (
                      <TableHead
                        key={index}
                        className="font-semibold min-w-[120px] text-xs"
                      >
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenanceDetail.records.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <TableCell
                          key={cellIndex}
                          className="text-xs max-w-[200px]"
                          title={cell?.toString()}
                        >
                          <div className="truncate">
                            {cell?.toString() || "-"}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
