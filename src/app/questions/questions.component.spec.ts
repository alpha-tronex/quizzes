import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { QuestionsComponent } from './questions.component';
import { Question, QuestionType } from '@models/quiz';

describe('QuestionsComponent', () => {
  let component: QuestionsComponent;
  let fixture: ComponentFixture<QuestionsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [ QuestionsComponent ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParams: { id: '1' },
              paramMap: convertToParamMap({})
            },
            queryParams: of({ id: '1' })
          }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(QuestionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Regression tests for a scoring bug where selections were recorded as
  // 1-based (answer position) while Quiz.correct is stored 0-based (array
  // index) — see server/models/Quiz.js and server/scripts/seed_guest_cohort.js.
  // Comparing the two directly marked every correctly-answered question
  // incorrect (and made a question whose correct answer was the first
  // option unscorable as correct at all, since no 1-based selection can
  // equal 0). Selection is now recorded as a plain 0-based index throughout,
  // matching `correct`.
  describe('answer indexing (0-based, matching Quiz.correct)', () => {
    function makeQuestion(overrides: Partial<Question> = {}): Question {
      return {
        questionNum: 0,
        questionType: QuestionType.SingleAnswer,
        question: 'Solve for x: 2x + 3 = 11',
        instructions: 'Select the one correct answer.',
        answers: ['3', '4', '5', '6'],
        correct: [1],
        selection: [],
        isCorrect: null,
        ...overrides
      };
    }

    it('recordSingleAnswer() stores the raw 0-based index', () => {
      component.curQuestion = makeQuestion();

      component.recordSingleAnswer(1); // the "4" option, index 1

      expect(component.curQuestion.selection).toEqual([1]);
    });

    it('recordMultiChoiceAnswer() toggles the raw 0-based index', () => {
      component.curQuestion = makeQuestion({ selection: [] });

      component.recordMultiChoiceAnswer(2);
      expect(component.curQuestion.selection).toEqual([2]);

      component.recordMultiChoiceAnswer(2);
      expect(component.curQuestion.selection).toEqual([]);
    });

    it('isAnswerSelected() matches on the 0-based index', () => {
      component.curQuestion = makeQuestion({ selection: [0] });

      expect(component.isAnswerSelected(0)).toBe(true);
      expect(component.isAnswerSelected(1)).toBe(false);
    });

    it('getAnswerText() indexes answers[] directly, with no off-by-one', () => {
      const question = makeQuestion();

      expect(component.getAnswerText(question, 0)).toBe('3');
      expect(component.getAnswerText(question, 1)).toBe('4');
    });

    it('isQuestionCorrect() is true when the student picks the actual correct answer', () => {
      // Quiz.correct: [1] means answers[1] = "4" is correct.
      const question = makeQuestion({ selection: [1] });

      expect(component.isQuestionCorrect(question)).toBe(true);
    });

    it('isQuestionCorrect() is false for a wrong pick', () => {
      const question = makeQuestion({ selection: [0] });

      expect(component.isQuestionCorrect(question)).toBe(false);
    });

    it('isQuestionCorrect() handles a correct answer at index 0 (previously unscorable as correct)', () => {
      const question = makeQuestion({
        answers: ['True', 'False'],
        correct: [0],
        selection: [0]
      });

      expect(component.isQuestionCorrect(question)).toBe(true);
    });

    it('isQuestionCorrect() sorts numerically, not lexicographically, for multi-select', () => {
      const question = makeQuestion({
        questionType: QuestionType.MultipleChoice,
        answers: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'],
        correct: [2, 10],
        selection: [10, 2]
      });

      expect(component.isQuestionCorrect(question)).toBe(true);
    });
  });
});
