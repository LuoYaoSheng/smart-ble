import os
os.environ.setdefault('QT_QPA_PLATFORM', 'offscreen')
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from PySide6.QtCore import Qt, QPoint
from PySide6.QtGui import QAccessible, QAccessibleActionInterface
from PySide6.QtTest import QTest, QSignalSpy
from PySide6.QtWidgets import QApplication, QPushButton
from tabbar import CanonTabBar


class TabBarAccessibilityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = QApplication.instance() or QApplication([])

    def setUp(self):
        self.bar = CanonTabBar([('扫描', 'scan'), ('已连接', 'link'), ('广播', 'cast'), ('关于', 'info')])
        self.bar.resize(600, 64)
        self.bar.setCurrentIndex(0)
        self.bar.show()
        self.bar.activateWindow()
        self.app.processEvents()

    def tearDown(self):
        self.bar.close()
        self.app.processEvents()

    def test_every_tab_has_native_button_role_and_press_action(self):
        for button, name in zip(self.bar._buttons, ('扫描', '已连接', '广播', '关于')):
            self.assertIsInstance(button, QPushButton)
            interface = QAccessible.queryAccessibleInterface(button)
            self.assertIsNotNone(interface)
            self.assertEqual(interface.role(), QAccessible.Role.Button)
            self.assertEqual(interface.text(QAccessible.Text.Name), name)
            self.assertIn(QAccessibleActionInterface.pressAction(), interface.actionInterface().actionNames())
        spy = QSignalSpy(self.bar.currentChanged)
        QAccessible.queryAccessibleInterface(self.bar._buttons[2]).actionInterface().doAction(QAccessibleActionInterface.pressAction())
        if spy.count() == 0:
            self.assertTrue(spy.wait(1000), 'accessible press must activate the real button')
        self.assertEqual(self.bar.currentIndex(), 2)
        self.assertEqual(spy.count(), 1)

    def test_keyboard_tab_space_and_return_activate_once(self):
        first, second, third, fourth = self.bar._buttons
        first.setFocus()
        self.app.processEvents()
        self.assertTrue(first.hasFocus())
        QTest.keyClick(first, Qt.Key_Tab)
        self.assertTrue(second.hasFocus())
        spy = QSignalSpy(self.bar.currentChanged)
        QTest.keyClick(second, Qt.Key_Space)
        self.assertEqual(self.bar.currentIndex(), 1)
        self.assertEqual(spy.count(), 1)
        QTest.keyClick(second, Qt.Key_Tab)
        self.assertTrue(third.hasFocus())
        QTest.keyClick(third, Qt.Key_Return)
        self.assertEqual(self.bar.currentIndex(), 2)
        self.assertEqual(spy.count(), 2)
        QTest.keyClick(third, Qt.Key_Tab)
        self.assertTrue(fourth.hasFocus())
        QTest.keyClick(fourth, Qt.Key_Enter)
        self.assertEqual(self.bar.currentIndex(), 3)
        self.assertEqual(spy.count(), 3)
        QTest.keyClick(fourth, Qt.Key_Backtab)
        self.assertTrue(third.hasFocus())

    def test_full_cell_and_label_icon_badge_regions_activate_native_button(self):
        button = self.bar._buttons[1]
        button.set_badge(3)
        self.app.processEvents()
        for point in (QPoint(2, 2), button._icon.geometry().center(), button._text.geometry().center(), button._badge.geometry().center()):
            self.bar.setCurrentIndex(0)
            spy = QSignalSpy(self.bar.currentChanged)
            QTest.mouseClick(button, Qt.LeftButton, pos=point)
            self.assertEqual(self.bar.currentIndex(), 1)
            self.assertEqual(spy.count(), 1)
        for child in (button._icon, button._text, button._badge):
            self.assertTrue(child.testAttribute(Qt.WA_TransparentForMouseEvents))
        button.setEnabled(False)
        self.bar.setCurrentIndex(0)
        QTest.mouseClick(button, Qt.LeftButton)
        QTest.keyClick(button, Qt.Key_Return)
        self.assertEqual(self.bar.currentIndex(), 0)
