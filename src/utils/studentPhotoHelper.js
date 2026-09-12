/**
 * Helper module for student photos.
 * Replaces text initial logos (e.g., ui-avatars) with realistic student photos.
 */

const LOCAL_PHOTOS = [
  '/students/student_male_1.png',
  '/students/student_female_1.png',
  '/students/student_male_2.png',
  '/students/student_female_2.png',
  '/students/student_male_3.png',
];

const UNSPLASH_PHOTOS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
];

const FEMALE_KEYWORDS = ['female', 'priya', 'sneha', 'semaa', 'seema', 'pooja', 'ananya', 'riya', 'neha', 'sakshi', 'tanvi', 'divya', 'aarti', 'aditi', 'kavya', 'isha', 'shreya'];

/**
 * Returns a high quality student photo URL for a given student object.
 */
export function getStudentPhoto(student) {
  if (!student) return LOCAL_PHOTOS[0];

  const photo = student.photo || '';

  // If photo is valid custom URL / data URI / local path (and NOT a letter avatar like ui-avatars)
  if (photo && !photo.includes('ui-avatars.com') && !photo.includes('placeholder')) {
    return photo;
  }

  const nameLower = (student.name || '').toLowerCase();
  const isFemale = FEMALE_KEYWORDS.some(k => nameLower.includes(k));

  if (isFemale) {
    if (nameLower.includes('semaa') || nameLower.includes('seema')) return '/students/student_female_1.png';
    if (nameLower.includes('priya')) return '/students/student_female_2.png';
    if (nameLower.includes('sneha')) return '/students/student_female_1.png';
    return '/students/student_female_2.png';
  }

  // Male students
  if (nameLower.includes('rohit')) {
    const idNum = typeof student.id === 'number' ? student.id : (student.rollNo || '1');
    return String(idNum).includes('102') ? '/students/student_male_2.png' : '/students/student_male_1.png';
  }
  if (nameLower.includes('yuvraj')) return '/students/student_male_3.png';
  if (nameLower.includes('yesh')) return '/students/student_male_1.png';
  if (nameLower.includes('om')) return '/students/student_male_2.png';
  if (nameLower.includes('aarav')) return '/students/student_male_3.png';
  if (nameLower.includes('rohan')) return '/students/student_male_1.png';
  if (nameLower.includes('aditya')) return '/students/student_male_2.png';
  if (nameLower.includes('vikram')) return '/students/student_male_3.png';

  // Deterministic fallback based on student ID or RollNo
  const seedStr = String(student.id || student.rollNo || student.name || '1');
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % LOCAL_PHOTOS.length;
  return LOCAL_PHOTOS[index];
}

/**
 * Fallback photo URL if image load fails.
 */
export function getStudentPhotoFallback(student) {
  const seedStr = String(student?.id || student?.rollNo || student?.name || '1');
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % UNSPLASH_PHOTOS.length;
  return UNSPLASH_PHOTOS[index];
}

/**
 * Utility to resize high-resolution uploaded images to optimal passport dimensions (max 600x600)
 */
export function compressStudentPhoto(dataUrl, maxDim = 600) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Return high-quality compressed JPEG (0.85 quality)
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

