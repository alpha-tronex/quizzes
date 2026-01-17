import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Question, QuestionType, Quiz } from '../classes/quiz';
import { QuestionsService } from '../services/questions-service';
import { LoginService } from '../services/login-service';

@Component({
    selector: 'app-questions',
    templateUrl: './questions.component.html',
    styleUrls: ['./questions.component.css'],
    standalone: false
})
export class QuestionsComponent implements OnInit {
  multichoice: boolean;
  onechoice: boolean;
  truefalse: boolean;
  questionType: string;
  quiz: Quiz;
  curQuestion: Question;
  allAnswered: boolean = false;
  submitted: boolean = false;

  constructor(private questionsService: QuestionsService, private router: Router, private route: ActivatedRoute, private loginService: LoginService) { }

  ngOnInit() {
    // Get quiz ID from route params
    const quizId = this.route.snapshot.queryParams['id'];
    const id = quizId ? parseInt(quizId, 10) : undefined;
    
    this.questionsService.getQuiz(id).subscribe(
      (data: Quiz) => {
        this.quiz = data as Quiz;
        if (this.quiz && this.quiz.questions.length > 0) {
          this.curQuestion = this.quiz.questions[0];
          this.setQuestionType();
        }
      },
      (error) => console.error('Error fetching questions:', error)
    );
    console.log('questions, questions, questions');
  }

  goPrevious() {
    if (this.curQuestion.questionNum > 0) {
      this.curQuestion = this.quiz.questions[this.curQuestion.questionNum - 1];
      this.setQuestionType();
    }
  }

  goNext() {
    if (this.quiz.questions.length > this.curQuestion.questionNum) {
      this.curQuestion = this.quiz.questions[this.curQuestion.questionNum + 1];
      this.setQuestionType();
    }
  }

  recordMultiChoiceAnswer(answerNum: number) {
    if (!this.curQuestion.selection) {
      this.curQuestion.selection = [];
    }
    
    const index = this.curQuestion.selection.indexOf(answerNum);
    if (index > -1) {
      // Answer already selected, remove it (uncheck)
      this.curQuestion.selection.splice(index, 1);
    } else {
      // Answer not selected, add it (check)
      this.curQuestion.selection.push(answerNum);
    }
    this.checkAllAnswered();
  }

  recordSingleAnswer(answerNum: number) {
    if (!this.curQuestion.selection) {
      this.curQuestion.selection = [];
    }
    // For single choice (onechoice/truefalse), replace the selection with only the selected answer
    this.curQuestion.selection = [answerNum];
    this.checkAllAnswered();
  }

  isAnswerSelected(answerNum: number): boolean {
    if (!this.curQuestion || !this.curQuestion.selection) {
      return false;
    }
    return this.curQuestion.selection.includes(answerNum);
  }

  checkAllAnswered() {
    if (!this.quiz || !this.quiz.questions || this.quiz.questions.length === 0) {
      this.allAnswered = false;
      return;
    }
    
    this.allAnswered = this.quiz.questions.every(question => 
      question.selection && question.selection.length > 0
    );
  }

  submit() {
    if (this.allAnswered) {
      this.submitted = true;
      console.log('Quiz submitted:', this.quiz);
    }
  }

  retakeQuiz() {
    // Reset all selections
    if (this.quiz && this.quiz.questions) {
      this.quiz.questions.forEach(question => {
        question.selection = [];
      });
    }
    // Reset state
    this.submitted = false;
    this.allAnswered = false;
    // Go back to first question
    if (this.quiz && this.quiz.questions.length > 0) {
      this.curQuestion = this.quiz.questions[0];
      this.setQuestionType();
    }
  }

  acceptResults() {
    // Could navigate to home or show confirmation
    console.log('Results accepted');
    // Calculate score
    let score = 0;
    this.quiz.questions.forEach(question => {
      if (this.isQuestionCorrect(question)) {
        score++;
      }
    });

    // Prepare quiz data for saving
    const quizData = {
      id: this.quiz.id,
      title: this.quiz.title,
      completedAt: new Date(),
      questions: this.quiz.questions.map(q => ({
        questionNum: q.questionNum,
        question: q.question,
        selection: q.selection,
        correct: q.correct,
        isCorrect: this.isQuestionCorrect(q)
      })),
      score: score,
      totalQuestions: this.quiz.questions.length
    };

    // Save to database
    this.questionsService.saveQuiz(this.getUsername(), quizData).subscribe(
      (response) => {
        console.log('Quiz saved successfully:', response);
        // Redirect to history page
        this.router.navigate(['/history']);
      },
      (error) => {
        console.error('Error saving quiz:', error);
        // Still redirect even if save fails
        this.router.navigate(['/history']);
      }
    );
  }

  getAnswerText(question: Question, answerNum: number): string {
    switch(answerNum) {
      case 1: return question.answer1;
      case 2: return question.answer2;
      case 3: return question.answer3;
      case 4: return question.answer4;
      default: return '';
    }
  }

  isQuestionCorrect(question: Question): boolean {
    if (!question.selection || !question.correct) {
      return false;
    }
    
    // Check if both arrays have the same length and contain the same elements
    if (question.selection.length !== question.correct.length) {
      return false;
    }
    
    // Sort both arrays and compare
    const sortedSelection = [...question.selection].sort();
    const sortedCorrect = [...question.correct].sort();
    
    return sortedSelection.every((val, index) => val === sortedCorrect[index]);
  }

  getUsername(): string {
    // Check if user is logged in using localStorage
    if (localStorage.getItem('currentUser')) {
      return this.loginService.userName;
    }
    return '';
  }

  setQuestionType() {
    if (!this.curQuestion) {
      return;
    } 
    this.multichoice = this.curQuestion.questionType === QuestionType.MultipleChoice;
    this.onechoice = this.curQuestion.questionType === QuestionType.SingleAnswer;
    this.truefalse = this.curQuestion.questionType === QuestionType.TreuFalse;
  }
}
