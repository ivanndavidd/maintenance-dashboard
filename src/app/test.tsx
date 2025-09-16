"use client";

import type React from "react";
import { useState, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  BarChart3,
  TrendingUp,
  Plus,
  X,
  Wrench,
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
  Cell,
  LineChart,
  Line,
  Pie,
} from "recharts";
import * as XLSX from "xlsx";
import Image from "next/image";

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
  rows: DataTable;
  fileName: string;
  id: string; // Added unique ID for each file
}

interface ChartCard {
  id: string;
  name: string;
  type: "bar" | "pie" | "line";
  xColumn: string;
  yColumn?: string;
  groupColumn?: string;
  datasetId: string; // Changed from number to string to match file ID
}

// const MAINTENANCE_PRESETS = [
//   {
//     name: "Status Distribution",
//     type: "pie" as const,
//     description: "Shows distribution of approval/status values",
//   },
//   {
//     name: "Equipment Analysis",
//     type: "bar" as const,
//     description: "Analyzes equipment types or models",
//   },
//   {
//     name: "Approval Workflow",
//     type: "bar" as const,
//     description: "Shows approver activity and workload",
//   },
//   {
//     name: "Monthly Trends",
//     type: "line" as const,
//     description: "Time-based analysis of maintenance activities",
//   },
// ];

interface MaintenanceDetail {
  itemName: string;
  records: DataRow[];
  headers: string[];
  datasetId: string; // Changed from number to string
}

export default function MaintenanceDashboard() {
  const [uploadedFiles, setUploadedFiles] = useState<ExcelData[]>([]);
  const [chartCards, setChartCards] = useState<ChartCard[]>([]);

  const [, setIsAddCardOpen] = useState(false);
  const [activeDatasetId, setActiveDatasetId] = useState<string>("");
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

  // const detectMaintenanceColumns = (headers: string[]) => {
  //   const statusColumns = headers.filter(
  //     (h) =>
  //       h.toLowerCase().includes("status") ||
  //       h.toLowerCase().includes("approved") ||
  //       h.toLowerCase().includes("approval")
  //   );

  //   const equipmentColumns = headers.filter(
  //     (h) =>
  //       h.toLowerCase().includes("equipment") ||
  //       h.toLowerCase().includes("panel") ||
  //       h.toLowerCase().includes("model") ||
  //       h.toLowerCase().includes("type")
  //   );

  //   const approverColumns = headers.filter(
  //     (h) =>
  //       h.toLowerCase().includes("approver") ||
  //       h.toLowerCase().includes("approved by") ||
  //       h.toLowerCase().includes("bernard") ||
  //       h.toLowerCase().includes("iskandar")
  //   );

  //   return { statusColumns, equipmentColumns, approverColumns };
  // };

  const getMaintenanceDetails = (itemName: string, card: ChartCard) => {
    const excelData = uploadedFiles.find((file) => file.id === card.datasetId);
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
    const excelData = uploadedFiles.find((file) => file.id === card.datasetId);
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

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      Array.from(files).forEach((file) => {
        const fileExtension = file.name.toLowerCase().split(".").pop();
        const reader = new FileReader();
        const fileId =
          Date.now().toString() + Math.random().toString(36).substr(2, 9);

        if (fileExtension === "csv") {
          reader.onload = (e) => {
            try {
              const text = e.target?.result as string;
              const jsonData = parseCSV(text);

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
                  id: fileId,
                };

                setUploadedFiles((prev) => [...prev, newExcelData]);
                setTimeout(
                  () => createDefaultCharts(newExcelData, fileId),
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
                  id: fileId,
                };

                setUploadedFiles((prev) => [...prev, newExcelData]);
                setTimeout(
                  () => createDefaultCharts(newExcelData, fileId),
                  100
                );
              }
            } catch (error) {
              console.error("Error reading Excel file:", error);
            }
          };
          reader.readAsArrayBuffer(file);
        }
      });

      // Reset the input value to allow re-uploading the same file
      event.target.value = "";
    },
    []
  );

  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
    setChartCards((prev) => prev.filter((card) => card.datasetId !== fileId));
  }, []);

  const createDefaultCharts = (excelData: ExcelData, datasetId: string) => {
    if (!excelData || !excelData.headers) return;

    const fileName = excelData.fileName.toLowerCase();
    const headers = excelData.headers;

    const newCharts: ChartCard[] = [];

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

    if (fileName.includes("parts usage")) {
      // Create "Cost Part" bar chart using "Total Price Part 1" classified by "Part Model 1"
      const priceColumn = findColumn([
        "Total Price Part 1",
        "total price",
        "price",
        "cost",
      ]);
      const modelColumn = findColumn(["Area Usage", "model", "equipment"]);

      // if (modelColumn) {
      //   newCharts.push({
      //     id: `${datasetId}-parts-bar`,
      //     name: "Parts Usage Analysis",
      //     type: "bar",
      //     xColumn: modelColumn,
      //     yColumn: priceColumn || "",
      //     groupColumn: "",
      //     datasetId,
      //   });
      // }
      if (priceColumn && modelColumn) {
        newCharts.push({
          id: `default-cost-${Date.now()}`,
          name: "Cost Part",
          type: "bar",
          xColumn: modelColumn,
          yColumn: priceColumn,
          groupColumn: "",
          datasetId,
        });
      }
    }

    if (fileName.includes("preventive maintenance report")) {
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
        newCharts.push({
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
        newCharts.push({
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

    if (newCharts.length === 0) {
      const firstTextColumn = headers.find((h) => h && h.trim() !== "");
      if (firstTextColumn) {
        newCharts.push({
          id: `${datasetId}-default-bar`,
          name: "Data Distribution",
          type: "bar",
          xColumn: firstTextColumn,
          yColumn: "",
          groupColumn: "",
          datasetId,
        });
      }
    }

    setChartCards((prev) => [...prev, ...newCharts]);
  };

  const addChartCard = () => {
    if (!newCard.name || !newCard.xColumn || !activeDatasetId) return;

    const card: ChartCard = {
      id: Date.now().toString(),
      name: newCard.name,
      type: newCard.type,
      xColumn: newCard.xColumn,
      yColumn: newCard.yColumn || "",
      groupColumn: newCard.groupColumn || "",
      datasetId: activeDatasetId,
    };

    setChartCards((prev) => [...prev, card]);

    setNewCard({
      name: "",
      type: "bar",
      xColumn: "",
      yColumn: "",
      groupColumn: "",
    });
    setIsAddCardOpen(false);
  };

  const removeChartCard = (id: string) => {
    setChartCards((prev) => prev.filter((card) => card.id !== id));
  };

  const getChartData = (card: ChartCard) => {
    const excelData = uploadedFiles.find((file) => file.id === card.datasetId);
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

  const renderUploadSection = () => (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-center">
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-6 w-6 text-blue-600" />
            Upload Maintenance Data Files
          </div>
        </CardTitle>
        <CardDescription className="text-center">
          Upload multiple Excel (.xlsx, .xls) or CSV files with maintenance
          workflow data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border-2 border-dashed border-blue-400 rounded-lg p-8 min-h-[200px] flex flex-col items-center justify-center">
          <Input
            type="file"
            accept=".xlsx,.xls,.csv"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            id="excel-upload-multiple"
          />

          <Label htmlFor="excel-upload-multiple" className="cursor-pointer">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-blue-50 rounded-full">
                <FileSpreadsheet className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-gray-900">
                  Choose Maintenance Files
                </p>
                <p className="text-sm text-gray-500">
                  Excel/CSV with work items, approvals, equipment data
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  You can select multiple files at once
                </p>
              </div>
              <Button
                type="button"
                className="mt-2 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("excel-upload-multiple")?.click();
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

  const renderChartSection = (fileData: ExcelData) => {
    const fileCharts = chartCards.filter(
      (card) => card.datasetId === fileData.id
    );

    return (
      <Card key={fileData.id} className="border-2 border-blue-200">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                {fileData.fileName}
              </CardTitle>
              <CardDescription>
                {fileData.rows.length} records • {fileData.headers.length}{" "}
                columns
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveDatasetId(fileData.id)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Custom Chart
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Custom Chart</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="chart-name">Chart Name</Label>
                      <Input
                        id="chart-name"
                        value={newCard.name}
                        onChange={(e) =>
                          setNewCard({ ...newCard, name: e.target.value })
                        }
                        placeholder="Enter chart name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="chart-type">Chart Type</Label>
                      <Select
                        value={newCard.type}
                        onValueChange={(value: "bar" | "pie" | "line") =>
                          setNewCard({ ...newCard, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select chart type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bar">Bar Chart</SelectItem>
                          <SelectItem value="pie">Pie Chart</SelectItem>
                          <SelectItem value="line">Line Chart</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="x-column">X-Axis Column</Label>
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
                          {fileData.headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {newCard.type !== "pie" && (
                      <div>
                        <Label htmlFor="y-column">
                          Y-Axis Column (Optional)
                        </Label>
                        <Select
                          value={newCard.yColumn}
                          onValueChange={(value) =>
                            setNewCard({ ...newCard, yColumn: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select column or leave empty for count" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto-count">
                              Count of records
                            </SelectItem>
                            {fileData.headers.map((header) => (
                              <SelectItem key={header} value={header}>
                                {header}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Button onClick={addChartCard} className="w-full">
                      Add Chart
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveDatasetId(fileData.id);
                  const statusColumn = fileData.headers.find(
                    (h) =>
                      h.toLowerCase().includes("status") ||
                      h.toLowerCase().includes("approval")
                  );
                  const equipmentColumn = fileData.headers.find(
                    (h) =>
                      h.toLowerCase().includes("equipment") ||
                      h.toLowerCase().includes("asset")
                  );

                  if (statusColumn) {
                    const card: ChartCard = {
                      id: Date.now().toString(),
                      name: "Quick Status Analysis",
                      type: "pie",
                      xColumn: statusColumn,
                      yColumn: "",
                      groupColumn: "",
                      datasetId: fileData.id,
                    };
                    setChartCards((prev) => [...prev, card]);
                  } else if (equipmentColumn) {
                    const card: ChartCard = {
                      id: Date.now().toString(),
                      name: "Quick Equipment Analysis",
                      type: "bar",
                      xColumn: equipmentColumn,
                      yColumn: "",
                      groupColumn: "",
                      datasetId: fileData.id,
                    };
                    setChartCards((prev) => [...prev, card]);
                  }
                }}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Quick Charts
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {fileCharts.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {fileCharts.map((card) => (
                <Card key={card.id} className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 z-10"
                    onClick={() => removeChartCard(card.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {card.type === "bar" && <BarChart3 className="h-5 w-5" />}
                      {card.type === "pie" && <PieChart className="h-5 w-5" />}
                      {card.type === "line" && (
                        <TrendingUp className="h-5 w-5" />
                      )}
                      {card.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">{renderChart(card)}</div>
                    {renderDataTable(card)}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>
                No charts created yet. Use &quot;Quick Charts&quot; or
                &quot;Custom Chart&quot; to get started.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderChart = (card: ChartCard) => {
    const chartData = getChartData(card);

    if (!chartData || chartData.length === 0) {
      return (
        <div className="text-center py-4">
          No data available for this chart.
        </div>
      );
    }

    switch (card.type) {
      case "bar":
        return (
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
                textAnchor={chartData.length > 8 ? "end" : "middle"}
                height={chartData.length > 8 ? 100 : 10}
                interval={0}
                tick={{ fontSize: 12 }}
              />
              <YAxis tickFormatter={formatNumber} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
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
                textAnchor={chartData.length > 8 ? "end" : "middle"}
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
        );
      case "pie":
        return (
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
                innerRadius="40%"
                outerRadius={100}
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
        );
      default:
        return <div className="text-center py-4">Unsupported chart type.</div>;
    }
  };

  const renderDataTable = (card: ChartCard) => {
    const chartData = getChartData(card);

    if (!chartData || chartData.length <= 2) {
      return null;
    }

    return (
      <div className="mt-4 border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Data Values</h4>
        <div className="max-h-32 overflow-y-auto">
          <Table>
            <TableHeader className="bg-gray-300">
              <TableRow>
                <TableHead className="text-xs">{card.xColumn}</TableHead>
                <TableHead className="text-xs">
                  {card.yColumn || "Count"}
                </TableHead>
                <TableHead className="text-xs">Date Range</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chartData.map((item, index) => (
                <TableRow
                  key={index}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleDataValueClick(item.name, card)}
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
                  <TableCell className="text-xs">{item.dateRange}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
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
                src="/assets/blibli.jpg"
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
            <div className="flex items-center gap-2 flex-wrap">
              {uploadedFiles.map((file, index) => (
                <Badge
                  key={file.id}
                  variant={index === 0 ? "secondary" : "outline"}
                  className="flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {file.fileName}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="ml-1 hover:bg-red-100 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {uploadedFiles.length === 0 ? (
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
            {renderUploadSection()}
          </div>
        ) : (
          <div className="space-y-8">
            {renderUploadSection()}

            <div className="space-y-6">
              {uploadedFiles.map((fileData) => renderChartSection(fileData))}
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
