"""Exercise the real language classifier without loading the translation model."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'translation' / 'backend'))
from gemma_translation import LANGUAGE_NAMES, TextTranslator, language_detector, translation_prompt
from known_names import name_translation
from langid.langid import LanguageIdentifier, model


class LanguageDetectionTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.translator = TextTranslator.__new__(TextTranslator)
        cls.translator.detector = language_detector()
        cls.translator.identifier = LanguageIdentifier.from_modelstring(model, norm_probs=True)
        cls.translator.identifier.set_languages([
            code for code in cls.translator.identifier.nb_classes if code in LANGUAGE_NAMES])

    def test_short_english_comments(self):
        for text in ['i like sushi', 'I like sushi', 'i like pizza', 'i love sushi',
                     'i like this stream', 'this is fun', 'good morning']:
            with self.subTest(text=text):
                self.assertEqual(self.translator.detect(text), 'en')

    def test_other_languages(self):
        for text, code in [('Guten Morgen', 'de'), ('je suis heureux', 'fr'),
                           ('おはようございます', 'ja'), ('안녕하세요', 'ko'), ('你好', 'zh')]:
            with self.subTest(text=text):
                self.assertEqual(self.translator.detect(text), code)

    def test_known_name_bypasses_model_and_preserves_punctuation(self):
        translator = TextTranslator.__new__(TextTranslator)
        for text, expected in [('suzunayui', 'すずなゆい'), ('SuzunaYui!', 'すずなゆい!'),
                               ('@suzunayui 👋', '@すずなゆい 👋'), ('ｓｕｚｕｎａｙｕｉ', 'すずなゆい')]:
            with self.subTest(text=text):
                self.assertEqual(translator.translate(text), {'ja':expected, 'language':'en'})
        for text in ['hello suzunayui', 'suzunayui123', 'xsuzunayui']:
            self.assertIsNone(name_translation(text))
        self.assertIn('"すずなゆい"', translation_prompt('hello suzunayui', 'en'))
        self.assertNotIn('The proper name', translation_prompt('i like sushi', 'en'))


if __name__ == '__main__':
    unittest.main()
