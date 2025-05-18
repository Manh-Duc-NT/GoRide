import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  PhoneAuthProvider,
  signInWithCredential,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../config/firebase';
import { USER_ROLES, VERIFICATION_STATUS } from '../types/user';

// Email/Password Registration
export const registerWithEmailPassword = async (email, password, role = USER_ROLES.CUSTOMER) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Send email verification for CUSTOMER role
    if (role === USER_ROLES.CUSTOMER) {
      await sendEmailVerification(user);
    }

    await createUserProfile(user.uid, { 
      email, 
      role,
      emailVerified: false,
    });
    
    return user;
  } catch (error) {
    throw error;
  }
};

// Email/Password Login
export const loginWithEmailPassword = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update emailVerified status in profile if verified
    if (user.emailVerified) {
      await setDoc(doc(db, 'users', user.uid), {
        emailVerified: true,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    // Get full user profile
    const userProfile = await getUserProfile(user.uid);
    return { ...user, ...userProfile };
  } catch (error) {
    throw error;
  }
};

// Google Sign In
export const signInWithGoogle = async (role = USER_ROLES.CUSTOMER) => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Check if user profile exists
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      await createUserProfile(user.uid, {
        email: user.email,
        role,
        displayName: user.displayName,
        photoURL: user.photoURL,
      });
    }
    
    return user;
  } catch (error) {
    throw error;
  }
};

// Phone Authentication
export const verifyPhoneNumber = async (phoneNumber, recaptchaVerifier) => {
  try {
    const provider = new PhoneAuthProvider(auth);
    const verificationId = await provider.verifyPhoneNumber(phoneNumber, recaptchaVerifier);
    return verificationId;
  } catch (error) {
    throw error;
  }
};

export const confirmPhoneCode = async (verificationId, code) => {
  try {
    const credential = PhoneAuthProvider.credential(verificationId, code);
    const result = await signInWithCredential(auth, credential);
    return result.user;
  } catch (error) {
    throw error;
  }
};

// Create User Profile
export const createUserProfile = async (userId, userData) => {
  try {
    await setDoc(doc(db, 'users', userId), {
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      verificationStatus: userData.role === USER_ROLES.DRIVER ? VERIFICATION_STATUS.PENDING : null,
    });
  } catch (error) {
    throw error;
  }
};

// Upload Driver Documents
export const uploadDriverDocuments = async (userId, documents) => {
  try {
    const urls = {};
    
    for (const [docType, asset] of Object.entries(documents)) {
      if (!asset || !asset.uri) continue;

      const uri = asset.uri;

      const response = await fetch(uri);
      const blob = await response.blob();

      const uriParts = uri.split('.');
      const fileExtension = uriParts[uriParts.length - 1];

      const fileName = `${docType}.${fileExtension}`;
      const storageRef = ref(storage, `driver-documents/${userId}/${fileName}`);

      await uploadBytes(storageRef, blob);
      urls[docType] = await getDownloadURL(storageRef);
    }
    
    await setDoc(doc(db, 'users', userId), {
      documents: urls,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    
    return urls;
  } catch (error) {
    throw error;
  }
};

// Get User Profile
export const getUserProfile = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    throw error;
  }
};

// Update User Profile
export const updateUserProfile = async (userId, updates) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // Lấy và trả về thông tin người dùng đã cập nhật
    const updatedProfile = await getUserProfile(userId);
    return updatedProfile;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}; 