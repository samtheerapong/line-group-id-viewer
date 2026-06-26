# line-group-id

ตัวอย่างโปรเจกต์ Node.js สำหรับใช้งานกับ LINE Group ID

## วิธีใช้งาน

1. ติดตั้ง dependencies

```bash
npm install
```

2. สร้างไฟล์ `.env` จาก `.env.example` แล้วใส่ค่าการตั้งค่า

```bash
copy .env.example .env
```

3. รันเซิร์ฟเวอร์

```bash
npm start
```

4. เปิดเบราว์เซอร์ไปที่ `http://localhost:3000` หรือพอร์ตที่กำหนดในโปรเจกต์

## โครงสร้างไฟล์สำคัญ

- `server.js` - โค้ดเซิร์ฟเวอร์หลัก
- `.env` - ค่าการตั้งค่าที่เก็บความลับ
- `.gitignore` - ไฟล์ที่ไม่ควรนำขึ้น Git
