# Figura Cloud Backend

ระบบ Backend สำหรับจัดการไฟล์และเชื่อมต่อกับ Figura API พัฒนาด้วย Node.js และ Express

## 📋 คุณสมบัติหลัก

- **อัปโหลดไฟล์**: รองรับไฟล์ทุกประเภท (ขนาดสูงสุด 50MB)
- **จัดการไฟล์**: ลบ, ดูรายการ, และดาวน์โหลดไฟล์
- **เชื่อมต่อกับ Figura API**: ส่งข้อมูลไฟล์ไปยัง Figura Platform
- **Authentication**: ระบบยืนยันตัวตนด้วย JWT
- **Logging**: บันทึกการทำงานระบบอย่างละเอียด
- **Error Handling**: จัดการข้อผิดพลาดอย่างเป็นระบบ

## 🚀 การติดตั้ง

### ข้อกำหนดเบื้องต้น

- Node.js v14 หรือสูงกว่า
- npm หรือ yarn
- MongoDB (ถ้าใช้ database)

### ขั้นตอนการติดตั้ง

1. **Clone โปรเจกต์**
   ```bash
   git clone <repository-url>
   cd figura-cloud-backend
   ```

2. **ติดตั้ง Dependencies**
   ```bash
   npm install
   ```

3. **ตั้งค่า Environment Variables**
   
   สร้างไฟล์ `.env` ในโฟลเดอร์หลัก และตั้งค่าตามตัวอย่างด้านล่าง:

   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # File Upload Settings
   MAX_FILE_SIZE=52428800
   ALLOWED_FILE_TYPES=*

   # Figura API Configuration
   FIGURA_API_KEY=your_api_key_here
   FIGURA_API_URL=https://api.figura.com

   # Authentication (ถ้าใช้)
   JWT_SECRET=your_jwt_secret_here

   # Database (ถ้าใช้)
   MONGODB_URI=mongodb://localhost:27017/figura-cloud
   ```

   ### วิธีรับ Figura API Key
   
   1. ไปที่เว็บไซต์ [Figura](https://www.figuramc.org/) หรือผู้ให้บริการ
   2. ลงทะเบียนหรือเข้าสู่ระบบบัญชีของคุณ
   3. ไปที่ส่วน Developer Settings หรือ API Settings
   4. สร้าง API Key ใหม่
   5. คัดลอก API Key มาใส่ในไฟล์ `.env`

4. **รันเซิร์ฟเวอร์**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

   เซิร์ฟเวอร์จะทำงานที่ `http://localhost:3000`

## 📁 โครงสร้างโปรเจกต์

```
figura-cloud-backend/
├── src/
│   ├── controllers/      # Logic การทำงานของ API
│   ├── models/           # Data Models
│   ├── routes/           # API Routes
│   ├── middleware/       # Middleware ต่างๆ
│   ├── config/           # การตั้งค่าระบบ
│   ├── utils/            # Utility Functions
│   ├── app.js            # Express App Configuration
│   └── index.js          # Entry Point
├── uploads/              # โฟลเดอร์เก็บไฟล์อัปโหลด
├── .env                  # Environment Variables
├── .env.example          # ตัวอย่าง Environment Variables
├── package.json          # Project Dependencies
└── README.md             # เอกสารนี้
```

## 🔌 API Endpoints

### ไฟล์ (Files)

| Method | Endpoint | คำอธิบาย |
|--------|----------|---------|
| POST | `/api/files/upload` | อัปโหลดไฟล์ใหม่ |
| GET | `/api/files` | ดูรายการไฟล์ทั้งหมด |
| GET | `/api/files/:id` | ดูข้อมูลไฟล์เฉพาะ |
| DELETE | `/api/files/:id` | ลบไฟล์ |
| GET | `/api/files/:id/download` | ดาวน์โหลดไฟล์ |

### Figura Integration

| Method | Endpoint | คำอธิบาย |
|--------|----------|---------|
| POST | `/api/figura/sync` | ซิงค์ข้อมูลกับ Figura API |
| GET | `/api/figura/status` | ตรวจสอบสถานะการเชื่อมต่อ |

## 🔧 การตั้งค่าเพิ่มเติม

### ALLOWED_FILE_TYPES

- ค่าเริ่มต้น: `*` (รองรับทุกประเภทไฟล์)
- หากต้องการจำกัดประเภทไฟล์ สามารถเปลี่ยนเป็น array ได้ เช่น:
  ```env
  ALLOWED_FILE_TYPES=.lua,.png,.jpg,.jpeg,.gif
  ```

### MAX_FILE_SIZE

- ค่าเริ่มต้น: `52428800` (50MB)
- หน่วยเป็น bytes

## 🧪 การทดสอบ

```bash
# รัน tests (ถ้ามี)
npm test
```

## 📝 การใช้งาน

### อัปโหลดไฟล์

```bash
curl -X POST http://localhost:3000/api/files/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@path/to/your/file.lua"
```

### ดูรายการไฟล์

```bash
curl http://localhost:3000/api/files
```

## ⚠️ หมายเหตุสำคัญ

1. **ความปลอดภัย**: อย่า commit ไฟล์ `.env` ขึ้น Git repository
2. **API Key**: เก็บรักษา API Key เป็นความลับ
3. **Production**: ก่อน deploy ไป production ควรตั้งค่า `NODE_ENV=production`
4. **CORS**: ถ้าต้องการเรียก API จาก frontend คนละ domain ต้องตั้งค่า CORS ใน `src/app.js`

## 🤝 การมีส่วนร่วม

หากพบปัญหาหรือต้องการเพิ่มฟีเจอร์ กรุณาสร้าง Issue หรือ Pull Request

## 📄 License

[ระบุ License ของโปรเจกต์]

## 📞 ติดต่อ

หากมีคำถามหรือต้องการความช่วยเหลือ กรุณาติดต่อผ่าน [ช่องทางการติดต่อ]
