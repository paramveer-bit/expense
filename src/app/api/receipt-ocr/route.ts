
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import db from "@/lib/dbConnect";
import CategoryModel from "@/models/category.model";
import { parseReceipt, bufferToBase64 } from '@/lib/ai';







export async function POST(req: Request) {
  try {
    await db();
    // Get the session and userId--------------------------
    const session = await getServerSession(authOptions);
    // if (!session?.user?.id) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    const userId = "6740e9f6dfd4a80f1dae1d2a"

    // Getting the images---------------------------------------
    // 1. Process the incoming request body
    const formData = await req.formData();

    const imageFile = formData.get('receiptImage') as globalThis.File | null;
    if (!imageFile || imageFile.size === 0) {
      return NextResponse.json({ success: false, message: 'No image file uploaded.' }, { status: 400 });
    }

    // 2. Read the file content from its temporary location on disk
    const arrayBuffer = await imageFile.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    const mimeType = imageFile.type || 'application/octet-stream';

    // 3. CONVERT THE BUFFER TO BASE64 DATA URL
    const base64DataUrl: string = bufferToBase64(imageBuffer, mimeType);

    // Getting the Categories----------------------------------------------
    const cats = await CategoryModel.find({ user: userId });
    // console.log("Categories fetched for receipt parsing:", cats);
    // Passing everything to function and call it
    const trans = await parseReceipt(base64DataUrl, cats)
    if (trans.length === 0) {
      return NextResponse.json({ success: false, message: 'No transactions extracted from the receipt.' }, { status: 400 });
    }

    return NextResponse.json({ transactions: trans }, { status: 200 });



  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
