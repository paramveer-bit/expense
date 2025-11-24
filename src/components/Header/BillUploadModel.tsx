"use client";

import type React from "react";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Upload, AlertCircle, Trash2, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import axios from "axios";

interface ExtractedItem {
  title: string;
  amount: number;
  notes: string;
  category: string;
  categoryName: string;
  paymentMethod: string;
}

interface BillUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handelUpload: () => void;
}

export default function BillUploadDialog({
  open,
  onOpenChange,
  handelUpload,
}: BillUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        return;
      }
      if (!selectedFile.type.startsWith("image/")) {
        setError("Please upload an image file (JPG, PNG, etc.)");
        return;
      }
      setFile(selectedFile);
      setError(null);
      extractBillData(selectedFile);
    }
  };

  const extractBillData = async (imageFile: File) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("receiptImage", imageFile);

      // Call API route to extract bill data using AI
      // upload image with name receiptImage

      const response = await axios.post("/api/receipt-ocr", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      if (response.status === 400) {
        alert(response.data.message);
        setLoading(false);
        return;
      }
      if (response.status !== 200) {
        throw new Error("Failed to extract bill data");
      }

      const data = response.data;
      console.log("Extracted bill data:", data);
      setExtractedItems(data.transactions || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to process bill image"
      );
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = (index: number) => {
    setExtractedItems(extractedItems.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (
    index: number,
    field: keyof ExtractedItem,
    value: any
  ) => {
    const updated = [...extractedItems];
    updated[index] = { ...updated[index], [field]: value };
    setExtractedItems(updated);
  };

  const handleSubmit = async () => {
    if (extractedItems.length > 0) {
      try {
        const res = await axios.post("/api/receipt-ocr/add", {
          expenses: extractedItems,
        });
        if (res.status === 200) {
          handelClose();
          alert("Expenses added successfully!");
        }
        handelUpload();
      } catch (error) {
        alert("Failed to add expenses. Please try again.");
      }

      resetForm();
    }
  };

  const handelClose = () => {
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setFile(null);
    setExtractedItems([]);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handelClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Bill</DialogTitle>
          <DialogDescription>
            Upload an image of your bill to automatically extract items
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {extractedItems.length === 0 ? (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition"
                onClick={() => document.getElementById("bill-input")?.click()}
              >
                <Upload
                  className="mx-auto mb-3 text-muted-foreground"
                  size={32}
                />
                <p className="text-sm font-medium mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG up to 5MB
                </p>
                <input
                  id="bill-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {loading && (
                <div className="flex items-center justify-center py-4">
                  <Spinner className="mr-2" />
                  <span className="text-sm text-muted-foreground">
                    Extracting bill items...
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium">
                  Found{" "}
                  <span className="font-bold">{extractedItems.length}</span>{" "}
                  item(s) from your bill
                </p>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {extractedItems.map((item, index) => (
                  <div
                    key={index}
                    className="border border-border rounded-lg p-4 space-y-3 bg-background"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                          Item
                        </Label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) =>
                            handleUpdateItem(index, "title", e.target.value)
                          }
                          className="w-full px-2 py-1 border border-border rounded text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                          Amount
                        </Label>
                        <div className="flex items-center">
                          <span className="text-sm mr-1">₹</span>
                          <input
                            type="number"
                            value={item.amount}
                            onChange={(e) =>
                              handleUpdateItem(
                                index,
                                "amount",
                                Number.parseFloat(e.target.value)
                              )
                            }
                            className="w-full px-2 py-1 border border-border rounded text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                          Category
                        </Label>
                        <input
                          type="text"
                          value={item.categoryName}
                          onChange={(e) =>
                            handleUpdateItem(
                              index,
                              "categoryName",
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1 border border-border rounded text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                          Vendor/Notes
                        </Label>
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) =>
                            handleUpdateItem(index, "notes", e.target.value)
                          }
                          className="w-full px-2 py-1 border border-border rounded text-sm"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={resetForm} disabled={loading}>
            Cancel
          </Button>
          {extractedItems.length > 0 && (
            <Button
              onClick={handleSubmit}
              className="bg-blue-500 hover:bg-blue-600 flex-1"
            >
              <Plus size={16} className="mr-1" />
              Add {extractedItems.length} Expense
              {extractedItems.length !== 1 ? "s" : ""}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
