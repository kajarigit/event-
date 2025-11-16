// Standard department list for the institution
export const DEPARTMENTS = [
  'Computer Science and Engineering',
  'Electronics and Communication Engineering',
  'Electrical and Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Information Technology',
  'Artificial Intelligence and Data Science',
  'Chemical Engineering',
  'Biotechnology',
  'Mathematics',
  'Physics',
  'Chemistry',
  'English',
  'Management Studies',
  'Operations',
  'Administration',
  'Other',
];

// Department aliases for CSV normalization (handles common variations)
export const DEPARTMENT_ALIASES = {
  // CSE variations
  'cse': 'Computer Science and Engineering',
  'cs': 'Computer Science and Engineering',
  'computer science': 'Computer Science and Engineering',
  'computer science & engineering': 'Computer Science and Engineering',
  'computer science and engg': 'Computer Science and Engineering',
  'comp sci': 'Computer Science and Engineering',
  
  // ECE variations
  'ece': 'Electronics and Communication Engineering',
  'ec': 'Electronics and Communication Engineering',
  'electronics': 'Electronics and Communication Engineering',
  'electronics & communication': 'Electronics and Communication Engineering',
  'electronics and communication': 'Electronics and Communication Engineering',
  'electronics and communication engg': 'Electronics and Communication Engineering',
  
  // EEE variations
  'eee': 'Electrical and Electronics Engineering',
  'ee': 'Electrical and Electronics Engineering',
  'electrical': 'Electrical and Electronics Engineering',
  'electrical & electronics': 'Electrical and Electronics Engineering',
  'electrical and electronics': 'Electrical and Electronics Engineering',
  
  // Mechanical variations
  'mech': 'Mechanical Engineering',
  'me': 'Mechanical Engineering',
  'mechanical': 'Mechanical Engineering',
  'mechanical engg': 'Mechanical Engineering',
  
  // Civil variations
  'civil': 'Civil Engineering',
  'ce': 'Civil Engineering',
  'civil engg': 'Civil Engineering',
  
  // IT variations
  'it': 'Information Technology',
  'info tech': 'Information Technology',
  'information tech': 'Information Technology',
  
  // AI/DS variations
  'ai': 'Artificial Intelligence and Data Science',
  'aids': 'Artificial Intelligence and Data Science',
  'ai&ds': 'Artificial Intelligence and Data Science',
  'ai & ds': 'Artificial Intelligence and Data Science',
  'data science': 'Artificial Intelligence and Data Science',
  'artificial intelligence': 'Artificial Intelligence and Data Science',
  
  // Chemical variations
  'chem': 'Chemical Engineering',
  'chemical': 'Chemical Engineering',
  'chemical engg': 'Chemical Engineering',
  
  // Biotech variations
  'biotech': 'Biotechnology',
  'bt': 'Biotechnology',
  'bio technology': 'Biotechnology',
  
  // Science departments
  'maths': 'Mathematics',
  'math': 'Mathematics',
  'phy': 'Physics',
  'chem': 'Chemistry',
  
  // Management
  'mba': 'Management Studies',
  'management': 'Management Studies',
  'mgmt': 'Management Studies',
  
  // Operations/Admin
  'ops': 'Operations',
  'operation': 'Operations',
  'admin': 'Administration',
};

/**
 * Normalize department name from CSV or user input
 * Handles: lowercase, uppercase, extra spaces, common abbreviations
 */
export function normalizeDepartment(input) {
  if (!input || typeof input !== 'string') {
    return 'Other';
  }

  // Clean input: trim, lowercase, remove extra spaces
  const cleaned = input.trim().toLowerCase().replace(/\s+/g, ' ');

  // Check if it's already a standard department (case-insensitive match)
  const exactMatch = DEPARTMENTS.find(
    dept => dept.toLowerCase() === cleaned
  );
  if (exactMatch) {
    return exactMatch;
  }

  // Check aliases
  if (DEPARTMENT_ALIASES[cleaned]) {
    return DEPARTMENT_ALIASES[cleaned];
  }

  // No match found - return 'Other'
  return 'Other';
}

/**
 * Get department abbreviation for display
 */
export function getDepartmentAbbr(department) {
  const abbr = {
    'Computer Science and Engineering': 'CSE',
    'Electronics and Communication Engineering': 'ECE',
    'Electrical and Electronics Engineering': 'EEE',
    'Mechanical Engineering': 'MECH',
    'Civil Engineering': 'CIVIL',
    'Information Technology': 'IT',
    'Artificial Intelligence and Data Science': 'AI&DS',
    'Chemical Engineering': 'CHEM',
    'Biotechnology': 'BT',
    'Mathematics': 'MATH',
    'Physics': 'PHY',
    'Chemistry': 'CHEM',
    'English': 'ENG',
    'Management Studies': 'MGMT',
    'Operations': 'OPS',
    'Administration': 'ADMIN',
    'Other': 'OTHER',
  };
  return abbr[department] || department;
}
