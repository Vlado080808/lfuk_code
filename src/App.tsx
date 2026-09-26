import { useState, useEffect, useRef } from 'react';
import questionsData from './data/questions.json';
import { Question } from './types/quiz';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Award,
  ArrowRight,
  ArrowLeft,
  CheckSquare,
  Square,
  BarChart3,
  Timer,
  Target,
  RefreshCw,
} from 'lucide-react';

type Screen = 'start' | 'topics' | 'quiz' | 'result';

type Topic = {
  id: string;
  label: string;
  from: number;
  to: number;
};

const TOPICS: Topic[] = [
  { id: 'uvod', label: 'Úvod do biológie a biologické vedy', from: 1, to: 7 },
  { id: 'vlastnosti', label: 'Vlastnosti živých sústav a chemické zloženie bunky', from: 8, to: 23 },
  { id: 'bunka', label: 'Stavba bunky a bunkové organely', from: 24, to: 75 },
  { id: 'tkaniva', label: 'Tkanivá a fyziológia organizmov', from: 76, to: 85 },
  { id: 'metabolizmus', label: 'Transport látok, metabolizmus a enzýmy', from: 86, to: 114 },
  { id: 'cyklus', label: 'Bunkový cyklus, delenie a rozmnožovanie', from: 115, to: 162 },
  { id: 'molekularna-genetika', label: 'Molekulárna genetika – DNA, RNA a proteosyntéza', from: 163, to: 258 },
  { id: 'klasicka-genetika', label: 'Klasická, humánna a populačná genetika', from: 259, to: 521 },
  { id: 'mikrobiologia', label: 'Mikrobiológia, vírusy, parazity a imunita', from: 522, to: 588 },
  { id: 'vylucovacia', label: 'Vylučovacia sústava', from: 589, to: 600 },
  { id: 'hormonalna', label: 'Hormonálna (endokrinná) sústava', from: 601, to: 624 },
  { id: 'nervova', label: 'Nervová sústava, reflexy a zmysly', from: 625, to: 672 },
  { id: 'rozmnozovanie', label: 'Rozmnožovanie človeka, vývin a životné obdobia', from: 673, to: 728 },
  { id: 'koza-kostra', label: 'Koža a kostrová sústava', from: 729, to: 774 },
  { id: 'svalova', label: 'Svalová sústava', from: 775, to: 805 },
  { id: 'travacia', label: 'Tráviaca sústava, výživa a vitamíny', from: 806, to: 867 },
  { id: 'dychacia', label: 'Dýchacia sústava', from: 868, to: 878 },
  { id: 'krvny-obeh', label: 'Krv, miazga, srdce a krvný obeh', from: 879, to: 940 },
  { id: 'ekologia', label: 'Ekológia, evolúcia človeka a ochrana životného prostredia', from: 941, to: 1000 },
];

const QUESTION_COUNT = 20;

const shuffle = <T,>(items: T[]): T[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
};

const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function App() {
  const allQuestions = questionsData as Question[];
  const [screen, setScreen] = useState<Screen>('start');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // --- Stavy pre štatistiky vpravo ---
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const quizStartTimeRef = useRef<number | null>(null);

  // --- Nové stavy pre opakovanie nesprávnych otázok ---
  // Otázky, ktoré v tomto behu ešte neboli zodpovedané správne (zlyhali alebo boli nezodpovedané)
  const [wrongQuestions, setWrongQuestions] = useState<Question[]>([]);
  // Či aktuálny beh je "retry" (obsahuje iba otázky z wrongQuestions)
  const [isRetryMode, setIsRetryMode] = useState(false);

  const currentQuestion = activeQuestions[currentQuestionIndex];
  const availableQuestionCount = allQuestions.filter((question) => {
    const questionId = Number(question.id);
    return TOPICS.some(
      (topic) => selectedTopicIds.includes(topic.id) && questionId >= topic.from && questionId <= topic.to,
    );
  }).length;

  // --- Tikajúci efekt pre uplynutý čas počas testu ---
  useEffect(() => {
    if (screen !== 'quiz') return;
    if (quizStartTimeRef.current === null) {
      quizStartTimeRef.current = Date.now();
    }
    const interval = setInterval(() => {
      if (quizStartTimeRef.current !== null) {
        setElapsedTime(Math.floor((Date.now() - quizStartTimeRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [screen]);

  const toggleTopic = (topicId: string) => {
    setSelectedTopicIds((previous) =>
      previous.includes(topicId) ? previous.filter((id) => id !== topicId) : [...previous, topicId],
    );
  };

  const startQuiz = () => {
    const selectedTopics = TOPICS.filter((topic) => selectedTopicIds.includes(topic.id));
    const eligibleQuestions = allQuestions.filter((question) => {
      const questionId = Number(question.id);
      return selectedTopics.some((topic) => questionId >= topic.from && questionId <= topic.to);
    });

    const questionsForQuiz = shuffle(eligibleQuestions).slice(0, QUESTION_COUNT);
    if (questionsForQuiz.length === 0) return;

    setActiveQuestions(questionsForQuiz);
    setScreen('quiz');
    setCurrentQuestionIndex(0);
    setScore(0);
    setSelectedAnswers([]);
    setIsAnswerSubmitted(false);

    // reset štatistík
    setAnsweredCount(0);
    setCorrectCount(0);
    setElapsedTime(0);
    quizStartTimeRef.current = Date.now();

    // nový beh = žiadne nesprávne otázky, nie je retry
    setWrongQuestions([]);
    setIsRetryMode(false);
  };

  const startRetry = () => {
    if (wrongQuestions.length === 0) return;
    const retryQuestions = shuffle(wrongQuestions);

    setActiveQuestions(retryQuestions);
    setScreen('quiz');
    setCurrentQuestionIndex(0);
    setScore(0);
    setSelectedAnswers([]);
    setIsAnswerSubmitted(false);

    setAnsweredCount(0);
    setCorrectCount(0);
    setElapsedTime(0);
    quizStartTimeRef.current = Date.now();

    setWrongQuestions([]);
    setIsRetryMode(true);
  };

  const handleOptionToggle = (key: string) => {
    if (isAnswerSubmitted) return;
    setSelectedAnswers((previous) =>
      previous.includes(key) ? previous.filter((answer) => answer !== key) : [...previous, key],
    );
  };

  const handleSubmitAnswer = () => {
    if (isAnswerSubmitted || !currentQuestion) return;
    setIsAnswerSubmitted(true);

    const correctAnswers = currentQuestion.correct_answers;
    const isCorrect =
      selectedAnswers.length === correctAnswers.length &&
      selectedAnswers.every((key) => correctAnswers.includes(key));

    setAnsweredCount((previous) => previous + 1);
    if (isCorrect) {
      setScore((previous) => previous + 1);
      setCorrectCount((previous) => previous + 1);
    } else {
      // Ak odpoveď nebola správna, otázku si poznamenáme pre ďalšie kolo
      setWrongQuestions((previous) => {
        if (previous.some((q) => q.id === currentQuestion.id)) return previous;
        return [...previous, currentQuestion];
      });
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < activeQuestions.length - 1) {
      setCurrentQuestionIndex((previous) => previous + 1);
      setSelectedAnswers([]);
      setIsAnswerSubmitted(false);
    } else {
      setScreen('result');
    }
  };

  const successRate =
    answeredCount === 0 ? 0 : Math.round((correctCount / answeredCount) * 100);

  // Na výsledkovej obrazovke určíme, či ešte existujú nesprávne otázky na precvičenie
  const hasWrongQuestions = wrongQuestions.length > 0;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-4xl bg-slate-800/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-700/50">
        {screen === 'start' && (
          <div className="text-center space-y-6 py-6">
            <div className="inline-flex p-4 bg-indigo-500/10 rounded-full text-indigo-400 mb-2"><Award className="w-16 h-16" /></div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Prijímacie Skúšky – Biológia</h1>
            <p className="text-slate-400 text-base max-w-md mx-auto">Otestuj svoje vedomosti a priprav sa na prijímačky. Po výbere okruhov bude test obsahovať až {QUESTION_COUNT} náhodných otázok. Otázky môžu mať viacero správnych odpovedí.</p>
            <button onClick={() => setScreen('topics')} className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 mx-auto">Začať Test <ArrowRight className="w-5 h-5" /></button>
          </div>
        )}

        {screen === 'topics' && (
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <button onClick={() => setScreen('start')} aria-label="Späť" className="p-2 -ml-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700"><ArrowLeft className="w-5 h-5" /></button>
              <div><h2 className="text-2xl font-bold">Vyber okruhy</h2><p className="text-slate-400 mt-1">Označ jednu alebo viac tém, z ktorých chceš byť skúšaný.</p></div>
            </div>
            <div className="max-h-[52vh] overflow-y-auto space-y-2 pr-1">
              {TOPICS.map((topic) => {
                const isSelected = selectedTopicIds.includes(topic.id);
                return <button key={topic.id} onClick={() => toggleTopic(topic.id)} className={`w-full p-3.5 rounded-xl text-left border transition-all flex items-center gap-3 ${isSelected ? 'bg-indigo-600/20 border-indigo-500 text-indigo-100' : 'bg-slate-700/40 hover:bg-slate-700 border-slate-600/50 text-slate-200'}`}>
                  {isSelected ? <CheckSquare className="w-5 h-5 text-indigo-400 flex-shrink-0" /> : <Square className="w-5 h-5 text-slate-500 flex-shrink-0" />}
                  <span><span className="font-medium block">{topic.label}</span><span className="text-xs text-slate-400">Otázky {topic.from}–{topic.to}</span></span>
                </button>;
              })}
            </div>
            <div className="rounded-xl bg-slate-700/40 border border-slate-600/40 p-4 text-sm text-slate-300">{selectedTopicIds.length === 0 ? 'Vyber aspoň jeden okruh.' : availableQuestionCount < QUESTION_COUNT ? `Pre vybrané okruhy je dostupných iba ${availableQuestionCount} otázok. Test sa spustí s týmto počtom.` : `Dostupných otázok: ${availableQuestionCount}. Náhodne sa vyberie ${QUESTION_COUNT}.`}</div>
            <button onClick={startQuiz} disabled={availableQuestionCount === 0} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2">Spustiť test {availableQuestionCount > 0 && <span>({Math.min(QUESTION_COUNT, availableQuestionCount)} otázok)</span>} <ArrowRight className="w-5 h-5" /></button>
          </div>
        )}

        {screen === 'quiz' && currentQuestion && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
            {/* ĽAVÁ ČASŤ – samotný test */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-4 mb-6">
                <span className="text-sm font-medium text-slate-400">Otázka <span className="text-indigo-400 font-bold">{currentQuestionIndex + 1}</span> z {activeQuestions.length}</span>
                {isRetryMode && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                    Precvičovanie nesprávnych
                  </span>
                )}
              </div>
              <div className="w-full bg-slate-700/50 h-2 rounded-full mb-6 overflow-hidden"><div className="bg-indigo-500 h-full transition-all duration-300 ease-out" style={{ width: `${((currentQuestionIndex + 1) / activeQuestions.length) * 100}%` }} /></div>
              <h2 className="text-xl sm:text-2xl font-semibold mb-2 text-slate-50">{currentQuestion.id} {currentQuestion.question}</h2>
              <p className="text-xs text-indigo-300 mb-6 font-medium uppercase tracking-wider">(Označte všetky správne možnosti)</p>
              <div className="space-y-3 mb-6">
                {Object.entries(currentQuestion.options).map(([key, optionText]) => {
                  const isSelected = selectedAnswers.includes(key);
                  const isCorrectAnswer = currentQuestion.correct_answers.includes(key);
                  let buttonStyle = 'bg-slate-700/40 hover:bg-slate-700 border-slate-600/50 text-slate-200';
                  if (isAnswerSubmitted) buttonStyle = isCorrectAnswer ? isSelected ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-medium' : 'bg-orange-500/20 border-orange-500 text-orange-300 font-medium' : isSelected ? 'bg-rose-500/20 border-rose-500 text-rose-300' : 'bg-slate-800/40 border-slate-700/30 text-slate-500 opacity-50';
                  else if (isSelected) buttonStyle = 'bg-indigo-600/20 border-indigo-500 text-indigo-200 font-medium';
                  return <button key={key} onClick={() => handleOptionToggle(key)} disabled={isAnswerSubmitted} className={`w-full p-4 rounded-xl text-left border transition-all flex items-start justify-between gap-3 ${buttonStyle}`}><div className="flex items-start gap-3"><span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-600 text-indigo-400 uppercase mt-0.5">{key}</span><span>{optionText}</span></div><div className="flex-shrink-0 mt-0.5">{isAnswerSubmitted ? (isCorrectAnswer ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : isSelected ? <XCircle className="w-5 h-5 text-rose-400" /> : <Square className="w-5 h-5 text-slate-600" />) : isSelected ? <CheckSquare className="w-5 h-5 text-indigo-400" /> : <Square className="w-5 h-5 text-slate-500" />}</div></button>;
                })}
              </div>
              <div className="space-y-4 pt-2">{!isAnswerSubmitted ? <button onClick={handleSubmitAnswer} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2">Potvrdiť odpoveď</button> : <>{currentQuestion.explanation && <div className="p-4 bg-indigo-950/40 border border-indigo-800/40 rounded-xl text-sm text-indigo-200"><span className="font-semibold block mb-1">Vysvetlenie:</span>{currentQuestion.explanation}</div>}<button onClick={handleNextQuestion} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2">{currentQuestionIndex < activeQuestions.length - 1 ? 'Ďalšia otázka' : 'Zobraziť výsledky'} <ArrowRight className="w-5 h-5" /></button></>}</div>
            </div>

            {/* PRAVÁ ČASŤ – live štatistiky */}
            <aside className="lg:sticky lg:top-6 h-fit rounded-2xl bg-slate-900/60 border border-slate-700/60 p-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" /> Štatistiky
              </h3>

              <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-3">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <Target className="w-4 h-4 text-emerald-400" /> Úspešné otázky
                </div>
                <div className="text-2xl font-bold text-emerald-300">
                  {correctCount}
                  <span className="text-slate-500 text-base font-medium"> / {answeredCount}</span>
                </div>
              </div>

              <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-3">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <BarChart3 className="w-4 h-4 text-indigo-400" /> Percentuálna úspešnosť
                </div>
                <div className="text-2xl font-bold text-indigo-300">{successRate}%</div>
                <div className="w-full bg-slate-700/50 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full transition-all duration-300"
                    style={{ width: `${successRate}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-3">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <Timer className="w-4 h-4 text-amber-400" /> Uplynutý čas
                </div>
                <div className="text-2xl font-bold text-amber-300 tabular-nums">
                  {formatTime(elapsedTime)}
                </div>
              </div>

              <div className="text-xs text-slate-500 pt-2 border-t border-slate-700/50">
                Odpovedané: {answeredCount} / {activeQuestions.length}
              </div>
            </aside>
          </div>
        )}

        {screen === 'result' && (
          <div className="text-center space-y-6 py-4">
            <div className="inline-flex p-4 bg-indigo-500/10 rounded-full text-indigo-400"><Award className="w-16 h-16" /></div>
            <div>
              <h2 className="text-3xl font-bold mb-2">Test Ukončený!</h2>
              <p className="text-slate-400">Tvoje celkové skóre (plný počet bodov za bezchybnú otázku):</p>
            </div>
            <div className="text-5xl font-black text-indigo-400">{score} / {activeQuestions.length}</div>
            <p className="text-sm text-slate-400">{score / activeQuestions.length >= 0.7 ? '🎉 Skvelé! Si výborne pripravený na prijímačky.' : '📚 Ešte to chce trochu precvičovania, vyskúšaj to znova!'}</p>
            <div className="text-sm text-slate-400">Celkový čas testu: <span className="text-amber-300 font-semibold tabular-nums">{formatTime(elapsedTime)}</span></div>

            {hasWrongQuestions && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 text-sm text-amber-200 max-w-md mx-auto">
                Nesprávne zodpovedaných otázok: <span className="font-bold">{wrongQuestions.length}</span>. Môžeš si ich teraz precvičiť.
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {hasWrongQuestions && (
                <button
                  onClick={startRetry}
                  className="w-full sm:w-auto px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-xl transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" /> Precvičiť nesprávne otázky ({wrongQuestions.length})
                </button>
              )}
              <button
                onClick={() => setScreen('topics')}
                className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" /> Skúsiť znova od začiatku
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}