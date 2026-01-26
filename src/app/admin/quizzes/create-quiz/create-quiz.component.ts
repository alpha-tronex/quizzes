import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AdminQuizService } from '../../../services/admin-quiz.service';
import { QuestionType } from '../../../models/quiz';

interface Answer {
  text: string;
  isCorrect: boolean;
}

interface Question {
  questionText: string;
  answers: Answer[];
  questionType: QuestionType;
  instructions: string;
}

@Component({
    selector: 'app-create-quiz',
    templateUrl: './create-quiz.component.html',
    styleUrls: ['./create-quiz.component.css'],
    standalone: false
})
export class CreateQuizComponent implements OnInit {
  quizTitle: string = '';
  questions: Question[] = [];
  
  // Expose QuestionType enum to template
  QuestionType = QuestionType;
  questionTypes = Object.values(QuestionType);
  
  // Current question being edited
  currentQuestion: Question = {
    questionText: '',
    answers: [{ text: '', isCorrect: false }],
    questionType: QuestionType.MultipleChoice,
    instructions: this.getInstructions(QuestionType.MultipleChoice)
  };

  successMessage: string = '';
  errorMessage: string = '';
  isSubmitting: boolean = false;
  isCurrentQuestionSaved: boolean = false;

  constructor(
    private adminQuizService: AdminQuizService,
    private router: Router
  ) { }

  ngOnInit() {
  }
getInstructions(questionType: QuestionType): string {
    switch (questionType) {
      case QuestionType.TrueFalse:
        return 'Select the correct answer (True or False)';
      case QuestionType.MultipleChoice:
        return 'Select all correct answers';
      case QuestionType.SingleAnswer:
        return 'Select the correct answer';
      default:
        return 'Select the correct answer';
    }
  }

  onQuestionTypeChange() {
    this.currentQuestion.instructions = this.getInstructions(this.currentQuestion.questionType);
  }

  
  addAnswer() {
    this.currentQuestion.answers.push({ text: '', isCorrect: false });
  }

  removeAnswer(index: number) {
    if (this.currentQuestion.answers.length > 1) {
      this.currentQuestion.answers.splice(index, 1);
    }
  }

  addQuestion() {
    // Validate current question
    if (!this.currentQuestion.questionText.trim()) {
      this.errorMessage = 'Please enter a question text';
      return;
    }

    // Check if all answers have text
    const hasEmptyAnswers = this.currentQuestion.answers.some(a => !a.text.trim());
    if (hasEmptyAnswers) {
      this.errorMessage = 'Please fill in all answer options';
      return;
      instructions: this.getInstructions(QuestionType.MultipleChoice)
    }

    // Check if at least one answer is marked as correct
    const hasCorrectAnswer = this.currentQuestion.answers.some(a => a.isCorrect);
    if (!hasCorrectAnswer) {
      this.errorMessage = 'Please select at least one correct answer';
      return;
    }

    // Add question to list
    this.questions.push({ ...this.currentQuestion });
    
    // Clear the form
    this.currentQuestion = {
      questionText: '',
      answers: [{ text: '', isCorrect: false }],
      questionType: QuestionType.MultipleChoice,
      instructions: this.getInstructions(QuestionType.MultipleChoice)
    };
    this.isCurrentQuestionSaved = true;

    this.errorMessage = '';
    this.successMessage = 'Question saved successfully!';
    setTimeout(() => this.successMessage = '', 3000);
  }

  clearCurrentQuestion() {
    // Reset current question for adding another
    this.currentQuestion = {
      questionText: '',
      answers: [{ text: '', isCorrect: false }],
      questionType: QuestionType.MultipleChoice,
      instructions: this.getInstructions(QuestionType.MultipleChoice)
    };
    this.isCurrentQuestionSaved = false;
    this.errorMessage = '';
  }

  removeQuestion(index: number) {
    this.questions.splice(index, 1);
  }

  editQuestion(index: number) {
    this.currentQuestion = { ...this.questions[index] };
    this.questions.splice(index, 1);
    this.isCurrentQuestionSaved = false;
  }

  saveQuiz() {
    // Validate quiz
    if (!this.quizTitle.trim()) {
      this.errorMessage = 'Please enter a quiz title';
      return;
    }

    if (this.questions.length === 0) {
      this.errorMessage = 'Please add at least one question';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    // Format quiz data for backend
    const quizData = {
      title: this.quizTitle,
      questions: this.questions.map((q, index) => ({
        questionNum: index,
        questionType: q.questionType,
        instructions: q.instructions,
        question: q.questionText,
        answers: q.answers.map(a => a.text),
        correct: q.answers
          .map((a, i) => a.isCorrect ? i + 1 : -1)
          .filter(i => i !== -1)
      }))
    };

    // Save quiz
    this.adminQuizService.uploadQuiz(quizData).subscribe({
      next: (response) => {
        this.successMessage = 'Quiz created successfully!';
        setTimeout(() => {
          this.router.navigate(['/admin/quizzes']);
        }, 2000);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Error creating quiz';
        this.isSubmitting = false;
      }
    });
  }

  cancelQuiz() {
    if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
      this.router.navigate(['/admin/quizzes']);
    }
  }
}
