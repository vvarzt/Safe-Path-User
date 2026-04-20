# วิธีใช้ Prompt Font ในแอป

## 📝 วิธีที่ 1: ใช้ colors.fontFamily (แนะนำ)

```typescript
import colors from '../theme/colors';

const styles = StyleSheet.create({
  text: {
    fontFamily: colors.fontFamily, // Prompt Regular
    fontSize: 16,
    color: colors.foreground,
  },
  boldText: {
    fontFamily: colors.fontFamilyBold, // Prompt Bold
    fontSize: 18,
  },
  mediumText: {
    fontFamily: colors.fontFamilyMedium, // Prompt Medium
  },
  semiBoldText: {
    fontFamily: colors.fontFamilySemiBold, // Prompt SemiBold
  },
});
```

## 📝 วิธีที่ 2: ใช้ fonts helper

```typescript
import { fonts } from '../utils/fontHelper';

const styles = StyleSheet.create({
  text: {
    fontFamily: fonts.regular,
  },
  boldText: {
    fontFamily: fonts.bold,
  },
});
```

## 📝 วิธีที่ 3: ใช้ withPromptFont helper

```typescript
import { withPromptFont } from '../utils/fontHelper';

const styles = StyleSheet.create({
  text: withPromptFont({ fontSize: 16, color: '#000' }),
  boldText: withPromptFont({ fontSize: 18 }, 'bold'),
});
```

## ✅ ตัวอย่างการใช้งานจริง

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';

const MyComponent = () => {
  return (
    <View>
      <Text style={styles.title}>หัวข้อ</Text>
      <Text style={styles.body}>เนื้อหา</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  title: {
    fontFamily: colors.fontFamilyBold,
    fontSize: 24,
    color: colors.foreground,
  },
  body: {
    fontFamily: colors.fontFamily,
    fontSize: 16,
    color: colors.mutedForeground,
  },
});

export default MyComponent;
```

## 🎨 Font Weights ที่มี

- **Prompt_400Regular** - ใช้สำหรับข้อความทั่วไป
- **Prompt_500Medium** - ใช้สำหรับข้อความที่ต้องการเน้น
- **Prompt_600SemiBold** - ใช้สำหรับหัวข้อย่อย
- **Prompt_700Bold** - ใช้สำหรับหัวข้อหลัก

## 📌 หมายเหตุ

ต้องเพิ่ม `fontFamily` ในทุก Text style เพื่อให้ใช้ Prompt font
ถ้าไม่ระบุ จะใช้ font ระบบเริ่มต้น (San Francisco/Roboto)
