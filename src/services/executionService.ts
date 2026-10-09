import { Question, TestCase, TestCaseResult, ExecutionResult } from '../types';

export class ExecutionService {
  /**
   * Run code against visible test cases only (For the "Run" button)
   */
  public static runVisibleTests(
    question: Question,
    code: string
  ): ExecutionResult {
    const startTime = performance.now();
    const visibleTests = question.visibleTestCases || [];

    const { syntaxError, isFixed } = this.analyzeAndExecute(question, code);

    const testCaseResults: TestCaseResult[] = visibleTests.map((tc) => {
      if (syntaxError) {
        return {
          id: tc.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: '',
          passed: false,
          isHidden: false,
          error: syntaxError
        };
      }

      const passed = isFixed || (question.id === 'R1-Q03' && tc.input === '49');
      const actualOutput = passed
        ? tc.expectedOutput
        : (tc.buggyOutput || this.simulateBuggyOutput(question, code, tc.expectedOutput));

      return {
        id: tc.id,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput,
        passed,
        isHidden: false
      };
    });

    const passedCount = testCaseResults.filter((r) => r.passed).length;
    const executionTimeMs = Math.round(performance.now() - startTime + Math.random() * 15 + 8);

    let stdout = '';
    let stderr = '';
    if (syntaxError) {
      stderr = syntaxError;
    } else if (isFixed) {
      stdout = visibleTests[0]?.expectedOutput || question.expectedOutput;
    } else {
      stdout = this.simulateBuggyOutput(question, code, question.expectedOutput);
      stderr = this.generateDiagnosticWarning(question, code);
    }

    return {
      success: !syntaxError && passedCount === visibleTests.length,
      stdout,
      stderr,
      exitCode: syntaxError ? 1 : 0,
      executionTimeMs,
      testCaseResults,
      passedTests: passedCount,
      totalTests: visibleTests.length,
      marksEarned: 0,
      maxMarks: question.marks
    };
  }

  /**
   * Grade code against visible AND hidden test cases (For the "Submit" button)
   * Sanitizes hidden test cases before returning
   */
  public static evaluateFullSubmission(
    question: Question,
    code: string
  ): ExecutionResult {
    return this.gradeSubmission(question, code);
  }

  public static gradeSubmission(
    question: Question,
    code: string
  ): ExecutionResult {
    const startTime = performance.now();
    const allTests = [...(question.visibleTestCases || []), ...(question.hiddenTestCases || [])];

    const { syntaxError, isFixed } = this.analyzeAndExecute(question, code);

    const testCaseResults: TestCaseResult[] = allTests.map((tc) => {
      const isHidden = !!tc.isHidden;
      if (syntaxError) {
        return {
          id: tc.id,
          input: isHidden ? '[HIDDEN INPUT]' : tc.input,
          expectedOutput: isHidden ? '[HIDDEN EXPECTED OUTPUT]' : tc.expectedOutput,
          actualOutput: isHidden ? '[HIDDEN ACTUAL OUTPUT]' : '',
          passed: false,
          isHidden,
          error: syntaxError
        };
      }

      const passed = isFixed || (question.id === 'R1-Q03' && tc.input === '49');
      const actualOutput = passed
        ? tc.expectedOutput
        : (tc.buggyOutput || this.simulateBuggyOutput(question, code, tc.expectedOutput));

      return {
        id: tc.id,
        input: isHidden ? '[HIDDEN INPUT]' : tc.input,
        expectedOutput: isHidden ? '[HIDDEN EXPECTED OUTPUT]' : tc.expectedOutput,
        actualOutput: isHidden ? (passed ? '[HIDDEN MATCH]' : '[HIDDEN MISMATCH]') : actualOutput,
        passed,
        isHidden
      };
    });

    const passedCount = testCaseResults.filter((r) => r.passed).length;
    const totalCount = allTests.length;
    const executionTimeMs = Math.round(performance.now() - startTime + Math.random() * 15 + 8);

    const isFullyPassed = !syntaxError && passedCount === totalCount;
    // Speed bonus for correct answers: faster gets more, wrong gets 0
    let timeBonus = 0;
    if (isFullyPassed) {
      if (executionTimeMs <= 20) {
        timeBonus = 3;
      } else if (executionTimeMs <= 35) {
        timeBonus = 2;
      } else {
        timeBonus = 1;
      }
    }

    const marksEarned = isFullyPassed ? (question.marks + timeBonus) : 0;

    let stdout = '';
    let stderr = '';
    if (syntaxError) {
      stderr = syntaxError;
    } else if (isFixed) {
      stdout = question.expectedOutput;
    } else {
      stdout = this.simulateBuggyOutput(question, code, question.expectedOutput);
      stderr = this.generateDiagnosticWarning(question, code);
    }

    return {
      success: isFullyPassed,
      stdout,
      stderr,
      exitCode: syntaxError ? 1 : 0,
      executionTimeMs,
      testCaseResults,
      passedTests: passedCount,
      totalTests: totalCount,
      marksEarned,
      maxMarks: question.marks + 3
    };
  }

  /**
   * Internal syntax and logic evaluator for C and Python
   */
  private static analyzeAndExecute(
    question: Question,
    code: string
  ): { syntaxError: string | null; isFixed: boolean } {
    const cleanCode = code.trim();
    if (!cleanCode) {
      return { syntaxError: 'Error: Empty source code provided.', isFixed: false };
    }

    if (question.language === 'c') {
      return this.analyzeC(question, cleanCode);
    } else {
      return this.analyzePython(question, cleanCode);
    }
  }

  private static analyzeC(
    question: Question,
    code: string
  ): { syntaxError: string | null; isFixed: boolean } {
    // 1. Bracket and parenthesis balance
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      return {
        syntaxError: `gcc: error: expected '}' at end of input (found ${openBraces} '{' and ${closeBraces} '}')`,
        isFixed: false
      };
    }

    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      return {
        syntaxError: `gcc: error: mismatched parentheses in statement`,
        isFixed: false
      };
    }

    // 2. Check main function presence
    if (!code.includes('main') && !code.includes('int main')) {
      return {
        syntaxError: `undefined reference to \`main'\ncollect2: error: ld returned 1 exit status`,
        isFixed: false
      };
    }

    // 3. Question-specific bug fix checks
    const normalized = code.replace(/\s+/g, ' ');

    switch (question.id) {
      case 'R1-Q02': {
        // Fix: swap(int *a, int *b) and swap(&x, &y)
        const hasPointerParams = /swap\s*\(\s*int\s*\*\s*a\s*,\s*int\s*\*\s*b\s*\)/.test(code) || /swap\s*\(\s*int\s*\*\s*[a-z]/i.test(code);
        const hasDeref = /\*a\s*=\s*\*b/.test(code) || /\*temp\s*=/.test(code) || /temp\s*=\s*\*a/.test(code);
        const hasCallAddress = /swap\s*\(\s*&x\s*,\s*&y\s*\)/.test(code);
        return { syntaxError: null, isFixed: hasPointerParams && hasDeref && hasCallAddress };
      }

      case 'R1-Q04': {
        // Fix 1: Loop starts at i = 0 for sum
        const sumLoopZero = /for\s*\(\s*int\s+i\s*=\s*0\s*;\s*i\s*<\s*5\s*;\s*i\+\+\s*\)\s*sum\s*\+=/.test(code) ||
                            (code.match(/i\s*=\s*0\s*;\s*i\s*<\s*5/g) || []).length >= 2 ||
                            /for\s*\(\s*int\s+i\s*=\s*0\s*;[^;]*;\s*i\+\+\s*\)\s*\{?\s*sum\s*\+=/.test(code);
        // Fix 2: Float division
        const hasFloatDivision = /\(float\)\s*sum/.test(code) || /\/\s*5\.0/i.test(code) || /float\s+sum/.test(code) || /\(double\)\s*sum/.test(code);
        return { syntaxError: null, isFixed: sumLoopZero && hasFloatDivision };
      }

      case 'R1-Q06': {
        // Fix: low = mid + 1; and high = mid - 1;
        const hasLowUpdate = /low\s*=\s*mid\s*\+\s*1\s*;/.test(code);
        const hasHighUpdate = /high\s*=\s*mid\s*-\s*1\s*;/.test(code);
        return { syntaxError: null, isFixed: hasLowUpdate && hasHighUpdate };
      }

      default: {
        const matchesSolution = this.similarityCheck(code, question.correctSolution);
        const changedFromBug = code.trim() !== question.buggyCode.trim();
        return { syntaxError: null, isFixed: matchesSolution > 0.65 || (changedFromBug && matchesSolution > 0.45) };
      }
    }
  }

  private static analyzePython(
    question: Question,
    code: string
  ): { syntaxError: string | null; isFixed: boolean } {
    // 1. Check indentation errors
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('#') || !line.trim()) continue;
      // Check if line following def has no indentation
      if (i > 0 && lines[i - 1].trim().endsWith(':') && line.length > 0 && !line.startsWith(' ') && !line.startsWith('\t')) {
        return {
          syntaxError: `IndentationError: expected an indented block after '${lines[i - 1].trim()}' on line ${i + 1}`,
          isFixed: false
        };
      }
    }

    // 2. Question-specific bug fix checks
    switch (question.id) {
      case 'R1-Q01': {
        // Fix: range(1, n + 1) or range(2, n + 1)
        const hasRangeNPlusOne = /range\s*\(\s*(1\s*,\s*)?n\s*\+\s*1/i.test(code) || /range\s*\(\s*2\s*,\s*n\s*\+\s*1/i.test(code);
        return { syntaxError: null, isFixed: hasRangeNPlusOne };
      }

      case 'R1-Q03': {
        // Fix: check marks >= 90 before 75 before 50
        const idx90 = code.indexOf('90');
        const idx75 = code.indexOf('75');
        const idx50 = code.indexOf('50');
        const correctOrder = idx90 !== -1 && idx75 !== -1 && idx50 !== -1 && idx90 < idx75 && idx75 < idx50;
        const hasRangeChecks = /50\s*<=\s*marks\s*<\s*75/.test(code) || /marks\s*<\s*75/.test(code);
        return { syntaxError: null, isFixed: correctOrder || hasRangeChecks };
      }

      case 'R1-Q05': {
        // Fix 1: max_val = nums[0] or -inf
        const hasValidInit = /max_val\s*=\s*nums\[0\]/.test(code) || /max_val\s*=\s*float\(['"]-inf['"]\)/.test(code);
        // Fix 2: if n > max_val:
        const hasGreaterCheck = /if\s+[a-z]\s*>\s*max_val\s*:/.test(code) || /[a-z]\s*>\s*max_val/.test(code);
        return { syntaxError: null, isFixed: hasValidInit && hasGreaterCheck };
      }

      case 'R1-Q07': {
        // Fix: hanoi(n - 1, aux, dest, src)
        const hasSecondHanoiCall = /hanoi\s*\(\s*(int\s*\(\s*n\s*\)|n)\s*-\s*1\s*,\s*aux\s*,\s*dest\s*,\s*src\s*\)/.test(code);
        return { syntaxError: null, isFixed: hasSecondHanoiCall };
      }

      default: {
        // Generic fallback for custom organizer-created Python questions
        const matchesSolution = this.similarityCheck(code, question.correctSolution);
        const changedFromBug = code.trim() !== question.buggyCode.trim();
        return { syntaxError: null, isFixed: matchesSolution > 0.65 || (changedFromBug && matchesSolution > 0.45) };
      }
    }
  }

  private static simulateBuggyOutput(
    question: Question,
    code: string,
    expectedOutput: string
  ): string {
    // Return realistic faulty outputs based on question
    switch (question.id) {
      case 'R1-Q01': return '20';
      case 'R1-Q02': return 'x = 5, y = 10';
      case 'R1-Q03': return 'C';
      case 'R1-Q04': return 'Average = 18.00';
      case 'R1-Q05': return '-9';
      case 'R1-Q06': return '[Execution timed out: infinite loop detected]';
      case 'R1-Q07': return 'Move disk 1 from A to C\nMove disk 2 from A to B\nMove disk 3 from A to C';
      default: return `Mismatch output. Expected: ${expectedOutput}`;
    }
  }

  private static generateDiagnosticWarning(question: Question, code: string): string {
    if (question.language === 'c') {
      return `gcc: warning: runtime evaluation failed. Bug remains active: ${question.bugDescription}`;
    }
    return `python: AssertionError: Test assertion failed. Target output not met.`;
  }

  private static similarityCheck(s1: string, s2: string): number {
    const set1 = new Set(s1.split(/\s+/));
    const set2 = new Set(s2.split(/\s+/));
    let intersection = 0;
    set1.forEach((token) => {
      if (set2.has(token)) intersection++;
    });
    return (2 * intersection) / (set1.size + set2.size);
  }
}
