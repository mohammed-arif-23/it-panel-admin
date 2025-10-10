import { useQuery } from '@tanstack/react-query'

// Hook to fetch subject credits and GPA inclusion flags from Supabase
// EXACT COPY from main panel useResults.ts
export function useSubjectCredits() {
  return useQuery({
    queryKey: ['admin-subject-credits'],
    queryFn: async () => {
      
      try {
        // Get Supabase config from environment
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Supabase environment variables not configured');
        }
        
        // Try to fetch from main panel's Supabase subjects table first
        const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/subjects?select=code,credits`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (supabaseResponse.ok) {
          const supabaseSubjects = await supabaseResponse.json();
          
          // Convert to map
          const creditsMap: Record<string, number> = {};
          supabaseSubjects.forEach((subject: any) => {
            if (typeof subject.credits === 'number' && subject.code) {
              creditsMap[subject.code] = subject.credits;
            }
          });
          
          if (Object.keys(creditsMap).length > 0) {
            console.log('Subject credits loaded from Supabase:', Object.keys(creditsMap).length, 'subjects');
            return creditsMap;
          }
        }
      } catch (error) {
        console.log('Failed to fetch from Supabase, falling back to admin API:', error);
      }
      
      // Fallback to admin API
      const response = await fetch('/api/admin/subject-credits')
      if (!response.ok) {
        throw new Error('Failed to fetch subject credits from all sources')
      }
      
      const data = await response.json()
      
      // Convert to credits map - only numeric credits
      const creditsMap: Record<string, number> = {}
      data.subjects?.forEach((subject: any) => {
        if (typeof subject.credits === 'number') {
          creditsMap[subject.code] = subject.credits
        }
      })

      // If admin API returns empty credits, throw error
      if (Object.keys(creditsMap).length === 0) {
        console.error('No subject credits found in database - check Supabase subjects table')
        throw new Error('No subject credits found in database')
      }
      
      console.log('Subject credits loaded:', Object.keys(creditsMap).length, 'subjects')
      
      return creditsMap
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}


// Helper function to calculate GPA using Anna University formula: GPA = Σ(Ci × GPi) / Σ(Ci)
// EXACT COPY from main panel useResults.ts - ONLY subjects with credits in DB are included
export function calculateGPA(
  grades: Record<string, string>,
  subjectCredits?: Record<string, number>
): number {
  
  const subjects = Object.entries(grades)
  if (subjects.length === 0) return 0

  let totalWeightedPoints = 0 // Σ(Ci × GPi)
  let totalCredits = 0 // Σ(Ci)

  subjects.forEach(([subjectCode, grade]) => {
    const gradePoint = getGradePoint(grade)
    const credits = subjectCredits?.[subjectCode]
    
    if (typeof credits !== 'number') {
      return
    }
    
    const weightedPoints = credits * gradePoint
    
    totalWeightedPoints += weightedPoints
    totalCredits += credits
  })

  const gpa = totalCredits > 0 ? totalWeightedPoints / totalCredits : 0
  const roundedGPA = Math.round(gpa * 100) / 100
  
  return roundedGPA
}

// Anna University Grade Points (standard 10-point system) - copied from main panel
function getGradePoint(grade: string): number {
  const gradeMap: Record<string, number> = {
    'O': 10,
    'A+': 9,
    'A': 8,
    'B+': 7,
    'B': 6,
    'C': 5,
    'D': 4,
    'U': 0,
    'AB': 0,
    'UA': 0,
    'RA': 0,
    'SA': 0,
    'W': 0,
    'WD': 0
  }
  
  const gradePoint = gradeMap[grade] ?? 0
  return gradePoint
}

// Helper function to get grade color for UI - copied from main panel
export function getGradeColor(grade: string): string {
  const gradeColors: Record<string, string> = {
    'O': 'text-green-600 bg-green-50',
    'A+': 'text-green-500 bg-green-50',
    'A': 'text-blue-600 bg-blue-50',
    'B+': 'text-blue-500 bg-blue-50',
    'B': 'text-yellow-600 bg-yellow-50',
    'C': 'text-orange-600 bg-orange-50',
    'U': 'text-red-600 bg-red-50',
    'UA': 'text-gray-600 bg-gray-50',
  }
  return gradeColors[grade] || 'text-gray-600 bg-gray-50'
}

// Helper function to get semester performance status
export function getSemesterStatus(gpa: number): { status: string; color: string } {
  if (gpa >= 9) return { status: 'Excellent', color: 'text-green-600' }
  if (gpa >= 8) return { status: 'Very Good', color: 'text-blue-600' }
  if (gpa >= 7) return { status: 'Good', color: 'text-blue-500' }
  if (gpa >= 6) return { status: 'Average', color: 'text-yellow-600' }
  if (gpa >= 5) return { status: 'Below Average', color: 'text-orange-600' }
  return { status: 'Poor', color: 'text-red-600' }
}
