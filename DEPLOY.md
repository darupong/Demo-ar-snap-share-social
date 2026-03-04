# 🚀 Deploy to Vercel - AI Photo Feature

## ขั้นตอนการ Deploy

### 1. ตั้งค่า Environment Variable บน Vercel Dashboard

1. ไปที่ [Vercel Dashboard](https://vercel.com/dashboard)
2. เลือก Project ของคุณ
3. ไปที่ **Settings** > **Environment Variables**
4. เพิ่ม Environment Variable:
   - **Name**: `ARK_API_KEY`
   - **Value**: `your-actual-ark-api-key-here`
   - **Environment**: เลือก **Production**, **Preview**, และ **Development**
5. กด **Save**

### 2. Deploy ขึ้น Vercel

#### วิธีที่ 1: Push ขึ้น Git (แนะนำ)
```bash
git add .
git commit -m "Add AI Photo feature with Vercel serverless function"
git push origin main
```
Vercel จะ auto-deploy ให้อัตโนมัติ

#### วิธีที่ 2: Deploy ด้วย Vercel CLI
```bash
# Install Vercel CLI (ถ้ายังไม่มี)
npm i -g vercel

# Deploy
vercel --prod
```

### 3. ทดสอบ

1. เปิด `https://your-project.vercel.app/aiphoto`
2. กดปุ่มถ่ายรูป
3. รอ AI สร้างภาพ (10-30 วินาที)
4. ดาวน์โหลดหรือแชร์ภาพที่ได้

## ⚠️ สิ่งสำคัญ

- **API Key จะเก็บไว้ที่ Vercel Environment Variable** ไม่ได้เก็บใน client-side
- **ไฟล์ `.env.local` ห้ามโดน commit** (มีใน `.gitignore` แล้ว)
- **Serverless Function** ที่ `/api/generate-ai-photo` จะทำหน้าที่เป็น proxy ป้องกัน API Key รั่วไหล

## 📂 ไฟล์ที่สร้างใหม่

1. **`/api/generate-ai-photo.ts`** - Vercel Serverless Function (proxy สำหรับเรียก BytePlus API)
2. **`/.env.local`** - Template สำหรับ local development (ห้าม commit)
3. **`/vercel.json`** - Vercel configuration

## 🔧 Local Development

ถ้าต้องการทดสอบใน local:

1. แก้ไข `.env.local` ใส่ API Key จริง
2. รัน dev server:
```bash
vercel dev
```
3. เปิด `http://localhost:3000/aiphoto`

## 🎨 Features ที่เพิ่มเข้ามา

✅ ไม่มี UI สำหรับใส่ API Key (ซ่อนไว้ใน server)
✅ ไม่เก็บ API Key ใน localStorage
✅ Prompt ตายตัวตามที่กำหนด (ธีมธรรมชาติแฟนตาซี)
✅ Loading state ที่สวยงามพร้อมข้อความและ animation
✅ แสดงผลภาพ AI พร้อม overlay ข้อความสำเร็จ
✅ ปลอดภัยกว่า - API Key ไม่รั่วไหลไปยัง client
