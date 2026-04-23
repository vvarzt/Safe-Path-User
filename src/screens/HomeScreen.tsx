import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';
import { TextInput, Alert } from 'react-native';
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BookingCard from '../components/BookingCard';
import PromotionCarousel from '../components/PromotionCarousel';
import StatCards from '../components/StatCards';
import UpcomingBooking from '../components/UpcomingBooking';
import WaveHeader from '../components/WaveHeader';
import { auth, db } from '../firebase';
import { RootStackParamList } from '../navigation/AppNavigator';
import colors from '../theme/colors';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface HomeUser {
  fullName: string;
  profileImage?: string;
}

interface ActiveBooking {
  id: string;
  dateBooking: string;
  timeBooking: string;
  fromAddress: string;
  toAddress: string;
  distance: number;
  fare: number;
  paymentMethod: string;
  equipment: string[];
  gender_Care: string;
  caregiverId?: string;
  status?: string;
  update_cus?: string;
}

interface CaregiverInfo {
  firstName: string;
  lastName: string;
  phone: string;
  image?: string;
  gender: string;
  province: string;
  district: string;
}

const equipmentLabels: Record<string, string> = {
  wheelchair: '🦽 รถเข็น',
  stretcher: '🛏️ เปลหาม',
  oxygen: '💨 ออกซิเจน',
};

const paymentLabels: Record<string, string> = {
  promptpay: 'พร้อมเพย์',
  cash: 'เงินสด',
  credit: 'บัตรเครดิต',
};

const passengerLabels: Record<string, string> = {
  male: 'ชาย',
  female: 'หญิง',
  elderly: 'ผู้สูงอายุ',
};

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [user, setUser] = useState<HomeUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeBooking, setActiveBooking] = useState<ActiveBooking | null>(null);
  const [caregiver, setCaregiver] = useState<CaregiverInfo | null>(null);
  const [loadingCaregiver, setLoadingCaregiver] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const currentStatus = (activeBooking as any)?.status;
  const [prevStatus, setPrevStatus] = useState<string | null>(null);
  const [prevUpdateCus, setPrevUpdateCus] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");



  const handleSubmitReview = async () => {
    if (!activeBooking?.id) return;

    try {
      await db.collection("bookings").doc(activeBooking.id).update({
        score,
        comment,
        status: "completed",
        completedAt: new Date(),
      });

      setShowReview(false);
      setActiveBooking(null);

      Alert.alert("สำเร็จ", "ขอบคุณสำหรับการให้คะแนน");

    } catch (err) {
      console.log("❌ REVIEW ERROR:", err);
    }
  };


  const sendNotification = async (title: string, body: string) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null, // ยิงทันที
    });
  };
  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);
  useEffect(() => {

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const createNotification = async (title: string, message: string) => {
      await db.collection('notifications').add({
        userId: currentUser.uid,
        title,
        message,
        read: false,
        createdAt: new Date(),
      });
    };


    const statusLabel = (status: string) => {
      const map: Record<string, string> = {
        pending: "รอดำเนินการ",
        accepted: "ผู้ดูแลรับงานของคุณแล้ว",
        in_progress: "ผู้ดูแลกำลังเดินทางไปรับคุณ โปรดเตรียมตัวให้พร้อม", // ✅ เปลี่ยนตรงนี้
        confirmed: "ยืนยันแล้ว",
        cancelled: "ยกเลิก",
        completed: "เสร็จสิ้น",
      };

      return map[status] || status;
    };

    const statusColor = (status: string) => {
      const map: Record<string, string> = {
        pending: "#F59E0B",
        accepted: "#3B82F6",
        in_progress: "#FACC15", // ✅ เหลือง
        cancelled: "#EF4444",
        completed: "#10B981",
      };
      return map[status] || "#6B7280";
    };

    const userUnsub = db.collection('users').doc(currentUser.uid)
      .onSnapshot(userDoc => {
        if (userDoc.exists) {
          const userData = userDoc.data();
          setUser({
            fullName: userData?.fullName,
            profileImage: userData?.profileImage,
          });
        } else {
          setUser(null);
        }
        setLoadingUser(false);
      }, () => {
        setUser(null);
        setLoadingUser(false);
      });

    const notifUnsub = db.collection('notifications')
      .where('userId', '==', currentUser.uid)
      .onSnapshot(snapshot => {
        const unread = snapshot.docs.filter(doc => !doc.data().read).length;
        setUnreadCount(unread);
      }, () => { });

    // Listen for accepted bookings
    const bookingUnsub = db.collection('bookings')
      .where('userId', '==', currentUser.uid)
      .where('status', 'in', ['accepted', 'in_progress'])
      .onSnapshot(snapshot => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const data = doc.data() as any;

          const newStatus = data.status;
          const newUpdateCus = data.update_cus;

          setActiveBooking({
            id: doc.id,
            dateBooking: data.dateBooking,
            timeBooking: data.timeBooking,
            distance: data.distance,
            fare: data.fare,
            paymentMethod: data.paymentMethod,
            equipment: data.equipment || [],
            gender_Care: data.gender_Care,
            caregiverId: data.caregiverId,
            status: newStatus,
            update_cus: newUpdateCus,

            fromAddress: data.fromLocation?.address || '-',
            toAddress: data.toLocation?.address || '-',
          });

          // ✅ STATUS เดิม
          if (prevStatus !== null && prevStatus !== newStatus) {
            if (newStatus === "accepted") {
              sendNotification("ผู้ดูแลรับงานแล้ว", "ผู้ดูแลรับงานของคุณแล้ว กำลังเตรียมตัวเดินทาง");
            }

            if (newStatus === "in_progress") {
              sendNotification("กำลังเดินทาง", "ผู้ดูแลกำลังเดินทางไปรับคุณ โปรดเตรียมตัว");
            }
          }

          // ✅ NEW: update_cus
          if (prevUpdateCus !== null && prevUpdateCus !== newUpdateCus) {


            if (newUpdateCus === "received") {
              sendNotification(
                "กำลังไปปลายทาง",
                "ผู้บริการกำลังพาคุณไปยังปลายทาง"

              ); sendNotification(
                "จบการให้บริการ",
                "กรุณาให้คะแนนผู้ดูแล"
              );
            }

            if (newUpdateCus === "destination") {
              sendNotification(
                "ถึงปลายทางแล้ว",
                "ผู้บริการพาคุณมาถึงปลายทางแล้ว และกำลังบริการคุณอยู่"
              );
            }

            if (newUpdateCus === "back") {
              sendNotification(
                "กำลังเดินทางกลับ",
                "ผู้บริการกำลังพาคุณกลับบ้าน"
              );
            }

            if (newUpdateCus === "wait_cus" && prevUpdateCus !== "wait_cus") {
              setShowReview(true);
              sendNotification(
                "จบการให้บริการ",
                "กรุณายืนยันและให้คะแนนผู้ดูแล"
              );

              setShowReview(true); // ✅ เปิดหน้ารีวิวทันที
            }
          }

          setPrevStatus(newStatus);
          setPrevUpdateCus(newUpdateCus);

          // โหลด caregiver
          if (data.caregiverId) {
            setLoadingCaregiver(true);
            db.collection('caregivers').doc(data.caregiverId).get()
              .then(cgDoc => {
                if (cgDoc.exists) {
                  const cg = cgDoc.data() as any;
                  setCaregiver({
                    firstName: cg.firstName || '',
                    lastName: cg.lastName || '',
                    phone: cg.phone || '',
                    image: cg.image,
                    gender: cg.gender || '',
                    province: cg.province || '',
                    district: cg.district || '',
                  });
                }
                setLoadingCaregiver(false);
              })
              .catch(() => setLoadingCaregiver(false));
          }

        } else {
          setActiveBooking(null);
          setCaregiver(null);
        }
      });

    return () => {
      userUnsub();
      notifUnsub();
      bookingUnsub();
    };
  }, [prevStatus, prevUpdateCus]);


  const displayName = user?.fullName ?? '';


  if (showReview && activeBooking) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1, padding: 20 }}>

          <Text style={styles.sectionTitle}>ให้คะแนนผู้ดูแล</Text>

          {/* ⭐ Rating */}
          <View style={{ flexDirection: "row", justifyContent: "center", marginVertical: 20 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <TouchableOpacity key={i} onPress={() => setScore(i)}>
                <Ionicons
                  name={i <= score ? "star" : "star-outline"}
                  size={36}
                  color="#F59E0B"
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* 💬 Comment */}
          <TextInput
            placeholder="แสดงความคิดเห็นเพิ่มเติม..."
            value={comment}
            onChangeText={setComment}
            style={styles.input}
            multiline
          />

          {/* ✅ Confirm */}
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleSubmitReview}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>
              ยืนยันและจบงาน
            </Text>
          </TouchableOpacity>

        </SafeAreaView>
      </View>
    );
  }

  // ─── Active Job Mode ───────────────────────────────────────────────────────
  if (activeBooking) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <WaveHeader height={160}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
              <View style={styles.userInfo}>
                <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' } as any)}>
                  {user?.profileImage ? (
                    <Image source={{ uri: user.profileImage }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <View style={styles.greeting}>
                  <Text style={styles.greetingText}>กำลังดำเนินการ</Text>
                  <Text style={styles.fullname}>การเดินทางของคุณ</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => navigation.navigate('Notifications')}
              >
                <Ionicons name="notifications" size={20} color={colors.white} />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </WaveHeader>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.activeContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Status Badge */}
          <View style={[
            styles.activeBanner,
            {
              backgroundColor: currentStatus === "in_progress" ? "#FEF9C3" : `${colors.success}15`,
              borderColor: currentStatus === "in_progress" ? "#FACC15" : `${colors.success}40`
            }
          ]}>
            <View style={[
              styles.activeDot,
              { backgroundColor: currentStatus === "in_progress" ? "#FACC15" : colors.success }
            ]} />

            <Text style={[
              styles.activeBannerText,
              { color: currentStatus === "in_progress" ? "#CA8A04" : colors.success }
            ]}>
              {currentStatus === "in_progress"
                ? "ผู้ดูแลกำลังเดินทางไปรับคุณ โปรดเตรียมตัวให้พร้อม !"
                : "ผู้ดูแลรับงานของคุณแล้ว"}
            </Text>
          </View>

          {/* Caregiver Card */}
          <Text style={styles.sectionTitle}>ผู้ดูแลของคุณ</Text>

          {loadingCaregiver ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : caregiver ? (
            <View style={styles.caregiverCard}>
              <View style={styles.caregiverHeader}>
                {caregiver.image ? (
                  <Image source={{ uri: caregiver.image }} style={styles.caregiverAvatar} />
                ) : (
                  <View style={[styles.caregiverAvatar, styles.caregiverAvatarPlaceholder]}>
                    <Ionicons name="person" size={28} color={colors.primary} />
                  </View>
                )}
                <View style={styles.caregiverInfo}>
                  <Text style={styles.caregiverName}>{caregiver.firstName} {caregiver.lastName}</Text>
                  <Text style={styles.caregiverSub}>
                    {caregiver.gender === 'ชาย' ? '👨' : '👩'} {caregiver.gender}  •  📍 {caregiver.district}, {caregiver.province}
                  </Text>
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="shield-checkmark" size={12} color={colors.success} />
                    <Text style={styles.verifiedText}>ผ่านการตรวจสอบแล้ว</Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.callButton}
                activeOpacity={0.8}
                onPress={() => {
                  setShowPhone(true); // 👈 กดแล้วค่อยโชว์
                  Linking.openURL(`tel:${caregiver.phone}`);
                }}
              >
                <Ionicons name="call" size={18} color={colors.white} />
                <Text style={styles.callButtonText}>
                  โทรหาผู้ดูแล
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.detailCard}>
              <Text style={styles.emptyText}>ไม่พบข้อมูลผู้ดูแล</Text>
            </View>
          )}

          {/* Booking Detail Card */}
          <View style={styles.detailCard}>
            <Text style={styles.cardTitle}>รายละเอียดการเดินทาง</Text>

            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <Text style={styles.infoLabel}>วันที่ / เวลา</Text>
              <Text style={styles.infoValue}>{activeBooking.dateBooking} | {activeBooking.timeBooking} น.</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.routeContainer}>
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, { backgroundColor: colors.success }]} />
                <View style={styles.routeTextBox}>
                  <Text style={styles.routeLabel}>ต้นทาง</Text>
                  <Text style={styles.routeAddress}>{activeBooking.fromAddress}</Text>
                </View>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, { backgroundColor: colors.destructive }]} />
                <View style={styles.routeTextBox}>
                  <Text style={styles.routeLabel}>ปลายทาง</Text>
                  <Text style={styles.routeAddress}>{activeBooking.toAddress}</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{activeBooking.distance.toFixed(1)}</Text>
                <Text style={styles.statUnit}>กม.</Text>
                <Text style={styles.statLabel}>ระยะทาง</Text>
              </View>
              <View style={styles.statSeparator} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{activeBooking.fare.toLocaleString()}</Text>
                <Text style={styles.statUnit}>บาท</Text>
                <Text style={styles.statLabel}>ค่าบริการ</Text>
              </View>
              <View style={styles.statSeparator} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{paymentLabels[activeBooking.paymentMethod] || activeBooking.paymentMethod}</Text>
                <Text style={styles.statLabel}>การชำระเงิน</Text>
              </View>
            </View>

            {activeBooking.equipment.length > 0 && (
              <>
                <View style={styles.divider} />
                <Text style={styles.equipmentTitle}>อุปกรณ์เสริม</Text>
                <View style={styles.equipmentRow}>
                  {activeBooking.equipment.map((eq, i) => (
                    <View key={i} style={styles.equipmentChip}>
                      <Text style={styles.equipmentText}>{equipmentLabels[eq] || eq}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {activeBooking.gender_Care ? (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={16} color={colors.primary} />
                  <Text style={styles.infoLabel}>เพศผู้ดูแล</Text>
                  <Text style={styles.infoValue}>{passengerLabels[activeBooking.gender_Care] || activeBooking.gender_Care}</Text>
                </View>
              </>
            ) : null}
          </View>




        </ScrollView>
      </View>
    );
  }

  // ─── Normal Home Mode ──────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <WaveHeader height={180}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <View style={styles.userInfo}>
              <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' } as any)}>
                {user?.profileImage ? (
                  <Image source={{ uri: user.profileImage }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.greeting}>
                <Text style={styles.greetingText}>สวัสดี</Text>
                {loadingUser ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.fullname}>{displayName} !</Text>
                )}
                <Text style={styles.welcomeBack}>ยินดีต้อนรับกลับมา</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications" size={20} color={colors.white} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </WaveHeader>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <BookingCard />
        <PromotionCarousel />
        <UpcomingBooking />
        <StatCards />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarPlaceholder: {
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Prompt_700Bold',
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  greeting: {
    gap: 2,
  },
  greetingText: {
    fontFamily: 'Prompt_400Regular',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  fullname: {
    fontFamily: 'Prompt_700Bold',
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  welcomeBack: {
    fontFamily: 'Prompt_400Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.76)',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.destructive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: 'Prompt_700Bold',
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
  },
  content: {
    flex: 1,
    marginTop: -24,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  // ── Active mode ──────────────────────────────────────────────────────────────
  activeContentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    paddingTop: 16, // 👈 เพิ่มอันนี้
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${colors.success}15`,
    borderWidth: 1,
    borderColor: `${colors.success}40`,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  activeBannerText: {
    fontFamily: 'Prompt_600SemiBold',
    fontSize: 14,
    color: colors.success,
  },
  detailCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  cardTitle: {
    fontFamily: 'Prompt_700Bold',
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.foreground,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontFamily: 'Prompt_400Regular',
    fontSize: 13,
    color: colors.mutedForeground,
    flex: 1,
  },
  infoValue: {
    fontFamily: 'Prompt_600SemiBold',
    fontSize: 13,
    color: colors.foreground,
    textAlign: 'right',
    flexShrink: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  routeContainer: {
    gap: 4,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: colors.border,
    marginLeft: 5,
  },
  routeTextBox: {
    flex: 1,
  },
  routeLabel: {
    fontFamily: 'Prompt_400Regular',
    fontSize: 11,
    color: colors.mutedForeground,
  },
  routeAddress: {
    fontFamily: 'Prompt_500Medium',
    fontSize: 13,
    color: colors.foreground,
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontFamily: 'Prompt_700Bold',
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statUnit: {
    fontFamily: 'Prompt_400Regular',
    fontSize: 11,
    color: colors.mutedForeground,
  },
  statLabel: {
    fontFamily: 'Prompt_400Regular',
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  statSeparator: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  equipmentTitle: {
    fontFamily: 'Prompt_600SemiBold',
    fontSize: 13,
    color: colors.foreground,
    marginBottom: 8,
  },
  equipmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  equipmentChip: {
    backgroundColor: `${colors.primary}15`,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  equipmentText: {
    fontFamily: 'Prompt_500Medium',
    fontSize: 12,
    color: colors.primary,
  },
  sectionTitle: {
    fontFamily: 'Prompt_700Bold',
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.foreground,
    marginBottom: 12,
  },
  loadingBox: {
    padding: 32,
    alignItems: 'center',
  },
  caregiverCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  caregiverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  caregiverAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: `${colors.primary}30`,
  },
  caregiverAvatarPlaceholder: {
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caregiverInfo: {
    flex: 1,
    gap: 4,
  },
  caregiverName: {
    fontFamily: 'Prompt_700Bold',
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.foreground,
  },
  caregiverSub: {
    fontFamily: 'Prompt_400Regular',
    fontSize: 13,
    color: colors.mutedForeground,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  verifiedText: {
    fontFamily: 'Prompt_400Regular',
    fontSize: 11,
    color: colors.success,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  callButtonText: {
    fontFamily: 'Prompt_600SemiBold',
    fontSize: 15,
    color: colors.white,
  },
  emptyText: {
    fontFamily: 'Prompt_400Regular',
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: 16,
  },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 20,
  },

  confirmButton: {
    backgroundColor: "#10B981",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
});

export default HomeScreen;