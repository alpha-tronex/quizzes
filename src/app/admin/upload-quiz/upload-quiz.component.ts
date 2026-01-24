import { Component, OnInit } from '@angular/core';
import { QuizUploadService } from '../../services/quiz-upload.service';
import { QuestionType } from '../../classes/quiz';

@Component({
    selector: 'app-upload-quiz',
    templateUrl: './upload-quiz.component.html',
    styleUrls: ['./upload-quiz.component.css'],
    standalone: false
})
export class UploadQuizComponent implements OnInit {
  selectedFile: File | null = null;
  selectedFileName: string = '';
  fileContent: any = null;
  errorMessage: string = '';
  successMessage: string = '';
  uploading: boolean = false;
  isDragOver: boolean = false;

  constructor(private quizUploadService: QuizUploadService) { }

  ngOnInit() {
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    
    if (file) {
      this.selectedFile = file;
      this.selectedFileName = file.name;
      this.errorMessage = '';
      this.successMessage = '';
      
      // Validate file type
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.txt') && !fileName.endsWith('.rtf')) {
        this.errorMessage = 'Please select a valid text (.txt) or rich text (.rtf) file.';
        this.clearFile();
        return;
      }
      
      // Read and parse the file
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          let content = e.target.result;
          
          // If RTF file, strip RTF formatting
          if (fileName.endsWith('.rtf')) {
            content = this.stripRtfFormatting(content);
          }
          
          const quizData = this.parseQuizContent(content);
          const validationErrors = this.validateQuizStructure(quizData);
          
          if (validationErrors.length > 0) {
            this.errorMessage = 'Quiz validation failed:\n' + validationErrors.join('\n');
            this.fileContent = null;
          } else {
            this.fileContent = quizData;
          }
        } catch (error: any) {
          this.errorMessage = error.message || 'Error parsing file. Please check the format.';
          this.fileContent = null;
        }
      };
      reader.readAsText(file);
    }
  }

  stripRtfFormatting(rtfContent: string): string {
    // Remove RTF header and control words
    let text = rtfContent;
    
    // Remove RTF control symbols and groups
    text = text.replace(/\{\\\*[^}]*\}/g, ''); // Remove destination control symbols
    text = text.replace(/\{\\[a-z]+[0-9-]* ?/gi, ''); // Remove control words with parameters
    text = text.replace(/\\[a-z]+[0-9-]*[ ]?/gi, ' '); // Replace control words with space
    text = text.replace(/[{}]/g, ''); // Remove braces
    text = text.replace(/\\'/g, "'"); // Handle escaped quotes
    text = text.replace(/\\\\/g, ''); // Remove escaped backslashes
    text = text.replace(/\\~/g, ' '); // Non-breaking space
    text = text.replace(/\\-/g, '-'); // Optional hyphen
    text = text.replace(/\\_/g, '-'); // Non-breaking hyphen
    text = text.replace(/\\par[\r\n]*/g, '\n'); // Paragraph breaks
    text = text.replace(/\\line[\r\n]*/g, '\n'); // Line breaks
    text = text.replace(/\\tab/g, '\t'); // Tabs
    
    // Remove any remaining backslashes that aren't part of valid escapes
    text = text.replace(/\\./g, ''); // Remove backslash followed by any character
    text = text.replace(/\\/g, ''); // Remove any remaining lone backslashes
    
    // Clean up multiple newlines and spaces
    text = text.replace(/\r\n/g, '\n');
    text = text.replace(/[ \t]+/g, ' ');
    text = text.replace(/\n\s*\n+/g, '\n');
    
    return text.trim();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Validate file type
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.txt') && !fileName.endsWith('.rtf')) {
        this.errorMessage = 'Please drop a valid text (.txt) or rich text (.rtf) file.';
        return;
      }

      // Process the dropped file using the same logic as file input
      this.selectedFile = file;
      this.selectedFileName = file.name;
      this.errorMessage = '';
      this.successMessage = '';
      
      // Read and parse the file
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          let content = e.target.result;
          
          // If RTF file, strip RTF formatting
          if (fileName.endsWith('.rtf')) {
            content = this.stripRtfFormatting(content);
          }
          
          const quizData = this.parseQuizContent(content);
          const validationErrors = this.validateQuizStructure(quizData);
          
          if (validationErrors.length > 0) {
            this.errorMessage = 'Quiz validation failed:\n\n' + validationErrors.join('\n');
            this.fileContent = null;
          } else {
            this.fileContent = quizData;
          }
        } catch (error: any) {
          this.errorMessage = error.message || 'Error parsing file. Please check the format.';
          this.fileContent = null;
        }
      };
      reader.readAsText(file);
    }
  }

  parseQuizContent(content: string): any {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const quiz: any = {
      questions: []
    };
    
    let currentQuestion: any = null;
    
    for (const line of lines) {
      // Remove quotes and any trailing/leading whitespace
      let cleanLine = line.replace(/^["']|["']$/g, '').trim();
      
      // Check if line contains a key-value pair
      const colonIndex = cleanLine.indexOf(':');
      if (colonIndex === -1) continue;
      
      let key = cleanLine.substring(0, colonIndex).trim();
      let value = cleanLine.substring(colonIndex + 1).trim();
      
      // Clean up key - remove quotes and backslashes
      key = key.replace(/["']/g, '').replace(/\\+$/g, '').trim();
      // Clean up value - remove leading/trailing quotes only
      value = value.replace(/^["']|["']$/g, '').trim();
      
      // Convert smart quotes to regular quotes before processing escape sequences
      value = value.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
      
      // Debug logging
      if (value.includes('\\')) {
        console.log('Before processEscapeSequences:', value);
        console.log('Character codes:', value.split('').map(c => c.charCodeAt(0)).join(','));
      }
      
      // Process escape sequences in value (must be done before stripping backslashes)
      value = this.processEscapeSequences(value);
      
      // Debug logging
      if (key === 'question') {
        console.log('After processEscapeSequences (question):', value);
      }
      
      if (key === 'title') {
        quiz.title = value;
      } else if (key === 'questionNum') {
        // Start a new question - push previous question if exists
        if (currentQuestion) {
          // Set default instructions if not provided
          this.setDefaultInstructions(currentQuestion);
          quiz.questions.push(currentQuestion);
          console.log('Pushed question:', currentQuestion.questionNum, currentQuestion.question);
        }
        currentQuestion = {
          questionNum: parseInt(value, 10),
          selection: [],
          answers: []
        };
        console.log('Started new question:', value);
      } else if (currentQuestion) {
        if (key === 'questionType') {
          currentQuestion.questionType = value;
        } else if (key === 'question') {
          currentQuestion.question = value;
        } else if (key === 'instructions') {
          currentQuestion.instructions = value;
        } else if (key.startsWith('answer')) {
          // Parse answer1, answer2, answer3, ... answerN
          const answerNum = parseInt(key.substring(6), 10);
          if (!isNaN(answerNum) && answerNum > 0) {
            // Ensure the answers array is large enough
            while (currentQuestion.answers.length < answerNum) {
              currentQuestion.answers.push('');
            }
            // Set the answer at index (answerNum - 1) because arrays are 0-indexed
            currentQuestion.answers[answerNum - 1] = value;
          }
        } else if (key === 'correct') {
          // Parse comma-separated correct answers
          currentQuestion.correct = value.split(',').map((v: string) => parseInt(v.trim(), 10));
        }
      }
    }
    
    // Add the last question
    if (currentQuestion) {
      this.setDefaultInstructions(currentQuestion);
      quiz.questions.push(currentQuestion);
      console.log('Pushed final question:', currentQuestion.questionNum, currentQuestion.question);
    }
    
    console.log('Total questions parsed:', quiz.questions.length);
    
    if (!quiz.title) {
      throw new Error('Quiz must have a title');
    }
    
    if (quiz.questions.length === 0) {
      throw new Error('Quiz must have at least one question');
    }
    
    return quiz;
  }

  setDefaultInstructions(question: any): void {
    if (!question.instructions) {
      if (question.questionType === QuestionType.MultipleChoice) {
        question.instructions = 'Please select all that apply:';
      } else if (question.questionType === QuestionType.SingleAnswer || question.questionType === QuestionType.TrueFalse) {
        question.instructions = 'Please select the correct answer:';
      } else {
        question.instructions = 'Please answer the question:';
      }
    }
  }
  processEscapeSequences(text: string): string {
    // Process escape sequences in correct order
    // First, temporarily replace \\ with a placeholder to preserve literal backslashes
    // Then replace \" and \', then restore the literal backslashes
    return text
      .replace(/\\\\/g, '\u0000')  // \\ -> null char (placeholder)
      .replace(/\\"/g, '"')         // \" -> "
      .replace(/\\'/g, "'")         // \' -> '
      .replace(/\u0000/g, '\\');    // null char -> \
  }
  validateQuizStructure(quiz: any): string[] {
    const errors: string[] = [];
    
    // Validate required fields (ID will be auto-assigned on server)
    if (!quiz.title) {
      errors.push('• Quiz must have a title field');
    }
    
    if (!quiz.questions || !Array.isArray(quiz.questions)) {
      errors.push('• Quiz must have a questions array');
      return errors; // Cannot validate questions if array doesn't exist
    }
    
    if (quiz.questions.length === 0) {
      errors.push('• Quiz must have at least one question');
      return errors;
    }
    
    // Validate each question
    quiz.questions.forEach((q: any, index: number) => {
      const questionNum = index + 1;
      
      if (!q.question) {
        errors.push(`• Question ${questionNum}: missing 'question' field`);
      }
      
      if (!q.instructions) {
        errors.push(`• Question ${questionNum}: missing 'instructions' field`);
      }
      
      if (!q.correct) {
        errors.push(`• Question ${questionNum}: missing 'correct' field`);
      } else if (!Array.isArray(q.correct)) {
        errors.push(`• Question ${questionNum}: 'correct' must be an array`);
      } else if (q.correct.length === 0) {
        errors.push(`• Question ${questionNum}: 'correct' array must have at least one answer`);
      }
      
      // Check for at least 2 answers
      if (!q.answers || !Array.isArray(q.answers)) {
        errors.push(`• Question ${questionNum}: missing 'answers' array`);
      } else {
        const answerCount = q.answers.filter((a: string) => a && a.trim() !== '').length;
        
        if (answerCount < 2) {
          errors.push(`• Question ${questionNum}: must have at least 2 answers (found ${answerCount})`);
        }
      }
    });
    
    return errors;
  }

  uploadQuiz(): void {
    if (!this.fileContent) {
      this.errorMessage = 'No file selected';
      return;
    }

    this.uploading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.quizUploadService.uploadQuiz(this.fileContent).subscribe({
      next: (response) => {
        this.successMessage = `Quiz "${this.fileContent.title}" uploaded successfully!`;
        this.uploading = false;
        // Clear after 3 seconds
        setTimeout(() => {
          this.clearFile();
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = error || 'Failed to upload quiz. Please try again.';
        this.uploading = false;
      }
    });
  }

  clearFile(): void {
    this.selectedFile = null;
    this.selectedFileName = '';
    this.fileContent = null;
    this.errorMessage = '';
    // Reset the file input
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }
}
