import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebase';
import colors from '../theme/colors';
import { Modal } from 'react-native';


// ─── Config การแสดงแจ้งเตือนขณะแอปเปิดอยู่ ───
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,  // ✅ เพิ่ม
    shouldShowList: true,    // ✅ เพิ่ม
  }),
});

// ─── ขอสิทธิ์แจ้งเตือน ───
async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ─── schedule แจ้งเตือนก่อน 1 นาที ───
async function scheduleBookingReminder(booking: Upcoming) {
  const triggerDate = parseDate(booking.dateBooking, booking.timeBooking);
  // const reminderTime = new Date(triggerDate.getTime() - 60 * 1000); // ลบ 1 นาที
  const reminderTime = new Date(triggerDate.getTime() - 24 * 60 * 60 * 1000); // ลบ 1 วัน (สำหรับทดสอบ)
  const now = new Date();

  if (reminderTime <= now) return; // ผ่านไปแล้ว ไม่ต้อง schedule

  // ยกเลิกของเดิมก่อน (กัน duplicate)
  await cancelBookingReminder(booking.id);

  await Notifications.scheduleNotificationAsync({
    identifier: `booking-reminder-${booking.id}`,
    content: {
      title: '🚗 การจองของคุณใกล้ถึงแล้ว!',
      body: `อีก 1 วัน | ${booking.dateBooking} ${booking.timeBooking}\nจาก: ${booking.from}`,
      data: { bookingId: booking.id },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderTime,
    },
  });

  console.log(`[REMINDER_SCHEDULED] ${booking.id} → ${reminderTime.toISOString()}`);
}
// ─── ยกเลิก reminder ───
async function cancelBookingReminder(bookingId: string) {
  await Notifications.cancelScheduledNotificationAsync(`booking-reminder-${bookingId}`);
}

// ─── ยกเลิก reminder ทั้งหมด ───
async function cancelAllReminders(bookingIds: string[]) {
  await Promise.all(bookingIds.map((id) => cancelBookingReminder(id)));
}



interface Upcoming {
  id: string;
  dateBooking: string;
  timeBooking: string;
  from: string;
  to: string;
  distance: number;
  fare: number;
  paymentMethod: string;
  status: string;
  equipment: string[];
}

const DetailRow = ({ icon, label, value }: {
  icon: any;
  label: string;
  value: string;
}) => (
  <View style={modalStyles.row}>
    <Ionicons name={icon} size={18} color="#43B7A5" style={{ width: 24 }} />
    <Text style={modalStyles.rowLabel}>{label}</Text>
    <Text style={modalStyles.rowValue} numberOfLines={2}>{value}</Text>
  </View>
);

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  bookingId: {
    fontSize: 12,
    color: '#9CA3AF',
    marginRight: 8,
  },
  closeBtn: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 7,
    gap: 10,
  },
  rowLabel: {
    fontSize: 13,
    color: '#6B7280',
    width: 72,
  },
  rowValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  confirmBtn: {
    marginTop: 16,
    backgroundColor: '#43B7A5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});

const statusLabels: Record<string, string> = {
  pending: 'รอดำเนินการ',
  accepted: 'รับงานแล้ว',
  completed: 'สำเร็จแล้ว',
  cancelled: 'ยกเลิกแล้ว',
};

const statusColors: Record<string, string> = {
  pending: colors.warning,
  accepted: colors.primary,
  completed: colors.success,
  cancelled: colors.destructive,
};

const thaiMonths: Record<string, number> = {
  'มกราคม': 1,
  'กุมภาพันธ์': 2,
  'มีนาคม': 3,
  'เมษายน': 4,
  'พฤษภาคม': 5,
  'มิถุนายน': 6,
  'กรกฎาคม': 7,
  'สิงหาคม': 8,
  'กันยายน': 9,
  'ตุลาคม': 10,
  'พฤศจิกายน': 11,
  'ธันวาคม': 12,
};

const parseDate = (dateStr: string, timeStr: string): Date => {
  if (!dateStr || !timeStr) return new Date(0);

  if (dateStr.includes(' ')) {
    const parts = dateStr.split(' ');

    // ✅ กรอง "ค.ศ." ออกก่อน แล้วเหลือแค่ตัวเลขและชื่อเดือน
    const filtered = parts.filter(p => p !== 'ค.ศ.' && p.trim() !== '');
    // filtered = ["24", "เมษายน", "2026"] หรือ ["27", "เมษายน", "2569"]

    if (filtered.length >= 3) {
      const day = parseInt(filtered[0]);
      const monthName = filtered[1];
      const month = thaiMonths[monthName];
      let year = parseInt(filtered[2]);

      // พ.ศ. → ค.ศ.
      if (year > 2400) year -= 543;

      if (day && month && year) {
        const isoDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${timeStr}:00`;
        const result = new Date(isoDate);
        // console.log(`[parseDate] "${dateStr} ${timeStr}" → ${result.toISOString()}`);   ตรวจสอบวันที่แปลง
        return result;
      }
    }
  }

  const [day, month, year] = dateStr.split('/');
  if (day && month && year) {
    const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timeStr}:00`;
    return new Date(isoDate);
  }

  return new Date(0);
};

interface BookingDocument {
  status?: string;
  createdAt?: string;
  dateBooking?: string;
  timeBooking?: string;
  fromAddress?: string;
  toAddress?: string;
  distance?: number;
  fare?: number;
  paymentMethod?: string;
  caregiverStatus?: string;
  equipment?: string[];
}

export const UpcomingBooking: React.FC = () => {
  const [upcomingList, setUpcomingList] = useState<Upcoming[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // ─── ขอสิทธิ์ครั้งแรก ───
  useEffect(() => {
    requestNotificationPermission().then(setPermissionGranted);
  }, []);

  // // ─── schedule/cancel เมื่อ list เปลี่ยน ───
  // // ❌ เดิม — ยกเลิกทุกตัวเมื่อ unmount (notification หายเมื่อออกจากหน้า)
  // useEffect(() => {
  //   if (!permissionGranted) return;
  //   upcomingList.forEach((booking) => {
  //     scheduleBookingReminder(booking);
  //   });
  //   return () => {
  //     cancelAllReminders(upcomingList.map((b) => b.id)); // ❌ ไม่ควร cancel ตรงนี้
  //   };
  // }, [upcomingList, permissionGranted]);

  // ✅ ใหม่ — cancel เฉพาะตัวที่หายออกจาก list (ถูกยกเลิก/เสร็จแล้ว)
  const prevListRef = React.useRef<Upcoming[]>([]);

  useEffect(() => {
    if (!permissionGranted) return;

    // schedule ทุกตัวใน list ปัจจุบัน
    upcomingList.forEach((booking) => {
      scheduleBookingReminder(booking);
    });

    // cancel เฉพาะตัวที่หายออกไปจาก list
    const currentIds = new Set(upcomingList.map((b) => b.id));
    const removedIds = prevListRef.current
      .map((b) => b.id)
      .filter((id) => !currentIds.has(id));

    cancelAllReminders(removedIds);
    prevListRef.current = upcomingList;
  }, [upcomingList, permissionGranted]);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setUpcomingList([]);
      return;
    }

    const query = db.collection('bookings').where('userId', '==', currentUser.uid);

    const unsubscribe = query.onSnapshot(async (snapshot) => {
      if (snapshot.empty) {
        setUpcomingList([]);
        return;
      }

      const now = new Date();

      // ✅ 1. sync payment เมื่อ booking ถูก cancelled
      const cancelPaymentPromises = snapshot.docs.map(async (doc) => {
        const data = doc.data() as any;

        if (data.status === 'cancelled') {
          const bookingId = doc.id;
          const userId = currentUser.uid;

          const paymentQuery = await db
            .collection('payments')
            .where('bookingId', '==', bookingId)
            .where('userId', '==', userId)
            .get();

          const updates = paymentQuery.docs.map((p) =>
            p.ref.update({ status: 'cancelled' })
          );

          return Promise.all(updates);
        }
      });

      await Promise.all(cancelPaymentPromises);

      // ✅ 2. auto cancel ถ้าเลยเวลา
      const deletePromises = snapshot.docs
        .map((doc) => {
          const data = doc.data() as any;
          const bookingTime = parseDate(data.dateBooking || '', data.timeBooking || '');
          const isExpired = bookingTime.getTime() > 0 && bookingTime <= now;
          const isDeletable = data.status === 'pending' || data.status === 'accepted';

          if (isExpired && isDeletable) {
            console.log(`[AUTO_CANCEL] booking ${doc.id}`);
            return db.collection('bookings').doc(doc.id).update({ status: 'cancelled' });
          }
          return null;
        })
        .filter(Boolean);

      await Promise.all(deletePromises);

      // ✅ 3. filter + sort
      const pendingBookings = snapshot.docs
        .map((doc) => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            dateBooking: data.dateBooking || '',
            timeBooking: data.timeBooking || '',
            from: data.fromLocation?.address || '',
            to: data.toLocation?.address || '',
            distance: data.distance || 0,
            fare: data.fare || 0,
            paymentMethod: data.paymentMethod || 'ไม่ระบุ',
            status: data.status || 'pending',
            equipment: data.equipment || [],
          };
        })
        .filter((b) => {
          if (b.status === 'cancelled' || b.status === 'completed') return false;
          const bookingTime = parseDate(b.dateBooking, b.timeBooking);
          if (bookingTime.getTime() > 0 && bookingTime <= now) return false;
          return true;
        })
        .sort((a, b) => {
          const dateA = parseDate(a.dateBooking, a.timeBooking);
          const dateB = parseDate(b.dateBooking, b.timeBooking);
          return dateA.getTime() - dateB.getTime();
        });

      setUpcomingList(pendingBookings);
    });

    return () => unsubscribe();
  }, []);

  if (upcomingList.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>การจองที่กำลังจะมาถึง</Text>
        <Text style={styles.emptyText}>ยังไม่มีการจองที่กำลังจะมาถึง</Text>
      </View>
    );
  }

  const BookingCard = ({ booking, isSingleCard = false }: { booking: Upcoming; isSingleCard?: boolean }) => {
    const caregiverLabel = statusLabels[booking.status] || statusLabels.pending;
    const badgeColor = statusColors[booking.status] || statusColors.pending;
    const [modalVisible, setModalVisible] = useState(false);

    const handleCardPress = () => {
      setModalVisible(true);
    };
    const paymentMap: Record<string, string> = {
      cash: 'เงินสด',
      promptpay: 'พร้อมเพย์',
      credit: 'บัตรเครดิต',
    };
    const equipmentMap: Record<string, string> = {
      wheelchair: 'รถเข็น',
      stretcher: 'เปล',
      oxygen: 'ออกซิเจน',
    };

    const handleDeleteBooking = () => {
      Alert.alert(
        'ยืนยันการยกเลิก',
        'คุณแน่ใจหรือไม่ ว่าต้องการยกเลิกรายการการจองบริการนี้?',
        [
          { text: 'ยกเลิก', style: 'cancel' },
          {
            text: 'ยกเลิกการจอง',
            style: 'destructive',
            onPress: async () => {
              try {
                await db.collection('bookings').doc(booking.id).update({ status: 'cancelled' });

                // ✅ เพิ่ม where userId เข้าไปด้วย
                const currentUserId = auth.currentUser?.uid;
                const paymentQuery = await db.collection('payments')
                  .where('bookingId', '==', booking.id)
                  .where('userId', '==', currentUserId)  // ✅ เพิ่มตรงนี้
                  .get();

                if (!paymentQuery.empty) {
                  const paymentDoc = paymentQuery.docs[0];
                  await paymentDoc.ref.update({ status: 'cancelled' });
                }

                Alert.alert('ยกเลิกสำเร็จ', 'รายการการจองถูกยกเลิกแล้ว');
              } catch (error) {
                console.log('[CANCEL_BOOKING_ERROR]', error);
                Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถยกเลิกการจองได้ กรุณาลองใหม่อีกครั้ง');
              }
            },
          },
        ],
      );
    };

    return (
      <TouchableOpacity
        style={[styles.card, isSingleCard && styles.cardSingle]}
        activeOpacity={0.7}
        onPress={handleCardPress}
      >
        <TouchableOpacity
          style={styles.trashButton}
          activeOpacity={0.7}
          onPress={(event) => {
            event.stopPropagation();
            handleDeleteBooking();
          }}
        >
          <Ionicons name="trash-outline" size={18} color={colors.destructive} />
        </TouchableOpacity>
        <View style={styles.rightBar} />
        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <Ionicons name="time" size={25} color={colors.mutedForeground} />
          </View>
          <View style={styles.content}>
            <Text style={styles.dateTime}>
              {booking.dateBooking} | {booking.timeBooking}
            </Text>
            <Text style={styles.locationText}>
              <Text style={styles.labelBold}>จาก: </Text>
              {booking.from}
            </Text>
            <Text style={styles.locationSubText}>
              <Text style={styles.labelBold}>ถึง: </Text>
              {booking.to}
            </Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>ระยะทาง</Text>
              <Text style={styles.detailValue}>{booking.distance.toFixed(1)} กม.</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>ค่าบริการ</Text>
              <Text style={styles.detailValue}>{booking.fare.toLocaleString()} บาท</Text>
            </View>
          </View>
        </View>
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            <View style={[styles.badge, { backgroundColor: `${badgeColor}1A` }]}>
              <Text style={[styles.badgeText, { color: badgeColor }]}>{caregiverLabel}</Text>
            </View>
            <Text style={styles.tapHint}>แตะเพื่อดูรายละเอียด</Text>
          </View>
        </View>
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableOpacity
            style={modalStyles.overlay}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          >
            <TouchableOpacity activeOpacity={1} style={modalStyles.sheet}>
              {/* Header */}
              <View style={modalStyles.header}>
                <Text style={modalStyles.title}>รายละเอียดการจอง</Text>
                <Text style={modalStyles.bookingId}>#{booking.id.slice(0, 6).toUpperCase()}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={modalStyles.closeBtn}>
                  <Ionicons name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={modalStyles.divider} />

              {/* Rows */}
              <DetailRow icon="calendar-outline" label="วันที่" value={booking.dateBooking} />
              <DetailRow icon="time-outline" label="เวลา" value={booking.timeBooking} />
              <DetailRow icon="location-outline" label="จาก" value={booking.from} />
              <DetailRow icon="navigate-outline" label="ถึง" value={booking.to} />
              <DetailRow icon="resize-outline" label="ระยะทาง" value={`${booking.distance.toFixed(1)} กม.`} />
              <DetailRow icon="cash-outline" label="ค่าบริการ" value={`฿${booking.fare.toLocaleString()}`} />
              <DetailRow
                icon="card-outline"
                label="ชำระเงิน"
                value={paymentMap[booking.paymentMethod] || booking.paymentMethod}
              />
              <DetailRow
                icon="construct-outline"
                label="อุปกรณ์"
                value={
                  booking.equipment?.length > 0
                    ? booking.equipment.map((e) => equipmentMap[e] || e).join(', ')
                    : 'ไม่มี'
                }
              />

              <View style={modalStyles.divider} />

              {/* Status Badge */}
              <View style={modalStyles.statusRow}>
                <Ionicons name="ellipse" size={10} color={badgeColor} />
                <Text style={[modalStyles.statusText, { color: badgeColor }]}>
                  {caregiverLabel}
                </Text>
              </View>

              {/* Close Button */}
              <TouchableOpacity
                style={modalStyles.confirmBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={modalStyles.confirmText}>ปิด</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>การจองที่กำลังจะมาถึง</Text>
      {upcomingList.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
        >
          {upcomingList.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </ScrollView>
      ) : (
        <BookingCard booking={upcomingList[0]} isSingleCard={true} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  emptyText: {
    fontFamily: 'Prompt_400Regular',
    fontSize: 14,
    color: colors.mutedForeground,
  },
  sectionTitle: {
    fontFamily: 'Prompt_700Bold',
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.foreground,
    marginBottom: 12,
  },
  scrollContainer: {
    marginHorizontal: -16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    paddingRight: 24,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    width: 320,
    overflow: 'hidden',
  },
  rightBar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 10, // ปรับความหนาได้
    backgroundColor: colors.primary,
  },
  cardSingle: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  dateTime: {
    fontFamily: 'Prompt_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground,
  },
  locationText: {
    fontFamily: 'Prompt_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedForeground,
    marginTop: 6,
  },
  locationSubText: {
    fontFamily: 'Prompt_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedForeground,
    marginTop: 6,
  },
  labelBold: {
    fontFamily: 'Prompt_700Bold',
    fontSize: 13,
    color: colors.foreground,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  detailLabel: {
    fontFamily: 'Prompt_400Regular',
    fontSize: 12,
    color: colors.mutedForeground,
  },
  detailValue: {
    fontFamily: 'Prompt_600SemiBold',
    fontSize: 14,
    color: colors.primary,
  },
  footer: {
    marginTop: 10,
    width: '100%',
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trashButton: {
    position: 'absolute',
    top: 6,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 2,
  },
  badge: {
    backgroundColor: `${colors.primary}1A`,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-end',
  },
  badgeText: {
    fontFamily: 'Prompt_500Medium',
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
  },
  tapHint: {
    fontFamily: 'Prompt_400Regular',
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 6,
  },



});

export default UpcomingBooking;