# Patient Transport App - React Native Expo Version

แอปจองบริการรับ-ส่งผู้ป่วย (React Native Expo)

## 📁 โครงสร้างโปรเจค

```
expo-version/
├── App.tsx                          # Entry point
├── package.json                     # Dependencies
├── README.md                        # คู่มือการใช้งาน
├── src/
│   ├── navigation/
│   │   └── AppNavigator.tsx         # React Navigation setup
│   ├── screens/
│   │   ├── WelcomeScreen.tsx        # หน้า Welcome
│   │   ├── LoginScreen.tsx          # หน้า Login
│   │   ├── SignUpScreen.tsx         # หน้าลงทะเบียน 1
│   │   ├── SignUp2Screen.tsx        # หน้าลงทะเบียน 2
│   │   ├── SignUp3Screen.tsx        # หน้าลงทะเบียน 3
│   │   ├── HomeScreen.tsx           # หน้าหลัก
│   │   ├── ProfileScreen.tsx        # หน้าโปรไฟล์
│   │   ├── EditProfileScreen.tsx    # แก้ไขโปรไฟล์
│   │   ├── HistoryScreen.tsx        # ประวัติการใช้บริการ
│   │   ├── SettingsScreen.tsx       # การตั้งค่า
│   │   ├── NotificationsScreen.tsx  # การแจ้งเตือน
│   │   ├── BookingDetailScreen.tsx  # รายละเอียดการจอง
│   │   ├── Booking1Screen.tsx       # ขั้นตอนจอง 1
│   │   ├── Booking2Screen.tsx       # ขั้นตอนจอง 2
│   │   ├── Booking3Screen.tsx       # ขั้นตอนจอง 3
│   │   └── Booking4Screen.tsx       # ขั้นตอนจอง 4
│   ├── components/
│   │   ├── WaveHeader.tsx           # Header with wave
│   │   ├── BookingCard.tsx          # การ์ดจองบริการ
│   │   ├── UpcomingBooking.tsx      # การจองที่กำลังมาถึง
│   │   ├── StatCards.tsx            # การ์ดสถิติ
│   │   ├── ProfileInfo.tsx          # ข้อมูลโปรไฟล์
│   │   ├── ServiceHistoryItem.tsx   # รายการประวัติ
│   │   └── ui/
│   │       ├── Button.tsx           # ปุ่มแบบ custom
│   │       └── Input.tsx            # Input field
│   ├── data/
│   │   ├── mockData.ts              # ข้อมูล mock
│   │   └── notificationData.ts      # ข้อมูลการแจ้งเตือน
│   └── theme/
│       └── colors.ts                # สี theme
```

## 🚀 การติดตั้ง

### 1. สร้างโปรเจค Expo ใหม่

```bash
npx create-expo-app patient-transport-app --template blank-typescript
cd patient-transport-app
```

### 2. คัดลอกไฟล์จาก expo-version

คัดลอกไฟล์ทั้งหมดจากโฟลเดอร์ `expo-version/` ไปยังโปรเจค Expo ที่สร้างใหม่

### 3. ติดตั้ง Dependencies

```bash
# Navigation
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context

# Icons
npx expo install @expo/vector-icons

# SVG
npx expo install react-native-svg

# Maps
npx expo install react-native-maps

# Date/Time Picker
npx expo install @react-native-community/datetimepicker

# Image Picker
npx expo install expo-image-picker

# Toast
npm install react-native-toast-message
```

### 4. รันโปรเจค

```bash
npx expo start
```

## 📱 Features

- ✅ หน้า Welcome, Login, และ Sign Up (3 ขั้นตอน)
- ✅ หน้าหลัก (Home) พร้อมการ์ดจอง
- ✅ ระบบการจอง 4 ขั้นตอน
- ✅ หน้าโปรไฟล์และแก้ไขโปรไฟล์
- ✅ ประวัติการใช้บริการ
- ✅ รายละเอียดการจอง
- ✅ การแจ้งเตือน
- ✅ การตั้งค่า
- ✅ Bottom Tab Navigation
- ✅ Wave Header Animation (SVG)
- ✅ Maps Integration
- ✅ Date/Time Picker
- ✅ Image Picker

## 🎨 Theme Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Primary | #0D9488 | ปุ่มหลัก, Links |
| Background | #F5F5F5 | พื้นหลังแอป |
| Card | #FFFFFF | การ์ด, ฟอร์ม |
| Foreground | #1F2937 | ข้อความหลัก |
| Muted | #6B7280 | ข้อความรอง |
| Accent | #F59E0B | ราคา, ดาว |
| Destructive | #EF4444 | ปุ่มยกเลิก |

## 📝 Notes

- ใช้ `@expo/vector-icons` แทน `lucide-react`
- ใช้ `react-native-svg` สำหรับ SVG elements
- ใช้ `react-native-maps` สำหรับ Google Maps
- ใช้ `StyleSheet.create()` แทน Tailwind CSS
- Navigation ใช้ `@react-navigation/native`

## 🔄 การแปลงจาก React Web

| React Web | React Native |
|-----------|--------------|
| `div` | `View` |
| `p`, `span`, `h1-h6` | `Text` |
| `button` | `TouchableOpacity` |
| `input` | `TextInput` |
| `img` | `Image` |
| `Link` | `navigation.navigate()` |
| `lucide-react` | `@expo/vector-icons` |
| Tailwind CSS | `StyleSheet.create()` |
| `svg` | `react-native-svg` |
