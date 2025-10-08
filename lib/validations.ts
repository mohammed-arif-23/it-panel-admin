export const GRADES = ['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'U', 'RA', 'UA'] as const;

export type Grade = typeof GRADES[number];

export interface GradeUpdateRequest {
  batch: string;
  department: string;
  year: number;
  semester: number;
  stu_reg_no: string;
  sub_code: string;
  new_grade: Grade;
}

export interface ResultFilters {
  batch: string;
  department: string;
  year: number;
  semester: number;
}

export function isValidGrade(grade: string): grade is Grade {
  return GRADES.includes(grade as Grade);
}

export function validateGradeUpdate(data: any): data is GradeUpdateRequest {
  return (
    typeof data.batch === 'string' &&
    typeof data.department === 'string' &&
    typeof data.year === 'number' &&
    typeof data.semester === 'number' &&
    typeof data.stu_reg_no === 'string' &&
    typeof data.sub_code === 'string' &&
    isValidGrade(data.new_grade)
  );
}

export function validateResultFilters(data: any): data is ResultFilters {
  return (
    typeof data.batch === 'string' &&
    typeof data.department === 'string' &&
    typeof data.year === 'number' &&
    typeof data.semester === 'number'
  );
}

export function getGradeColor(grade: string): string {
  switch (grade) {
    case 'O':
      return 'text-green-700 bg-green-50';
    case 'A+':
      return 'text-green-600 bg-green-50';
    case 'A':
      return 'text-green-500 bg-green-50';
    case 'B+':
      return 'text-blue-600 bg-blue-50';
    case 'B':
      return 'text-blue-500 bg-blue-50';
    case 'C':
      return 'text-yellow-600 bg-yellow-50';
    case 'P':
      return 'text-orange-600 bg-orange-50';
    case 'U':
    case 'RA':
    case 'UA':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-500';
  }
}

export function getGradeDescription(grade: Grade): string {
  const descriptions: Record<Grade, string> = {
    'O': 'Outstanding',
    'A+': 'Excellent',
    'A': 'Very Good',
    'B+': 'Good',
    'B': 'Above Average',
    'C': 'Average',
    'P': 'Pass',
    'U': 'Re-appear',
    'RA': 'Re-appear Arrear',
    'UA': 'University Arrear'
  };
  return descriptions[grade];
}
