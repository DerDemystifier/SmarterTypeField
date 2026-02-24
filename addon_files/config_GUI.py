import json

from aqt import QCheckBox, QDialog, QPushButton, QVBoxLayout, mw
from aqt.qt import qconnect
from aqt.utils import showInfo

from .helpers import on_config_save

from . import globals as g


def open_config_dialog():
    config = g.__addon_config__

    if not mw or not config:
        showInfo("Cannot open configuration dialog.")
        return

    # Create a dialog
    dialog = QDialog(mw)
    dialog.setWindowTitle("Add-on Configuration")

    # Create layout and widgets
    layout = QVBoxLayout()
    ignore_case_cb = QCheckBox("Ignore Case")
    ignore_case_cb.setChecked(config.get("ignore_case", True))
    ignore_case_cb.setToolTip(
        "When enabled, letter case differences are ignored.\n"
        "For example, 'Hello' and 'hello' are treated as the same."
    )

    ignore_accents_cb = QCheckBox("Ignore Accents")
    ignore_accents_cb.setChecked(config.get("ignore_accents", False))
    ignore_accents_cb.setToolTip(
        "When enabled, accented characters are treated as their base character.\n"
        "For example, 'café' and 'cafe', 'naïve' and 'naive' are treated as the same."
    )

    ignore_punct_cb = QCheckBox("Ignore Punctuations")
    ignore_punct_cb.setChecked(config.get("ignore_punctuations", False))
    ignore_punct_cb.setToolTip(
        "When enabled, punctuation marks are ignored during comparison.\n"
        "For example, 'Hello, world!' and 'Hello world' are treated as the same."
    )

    ignore_extra_words_cb = QCheckBox(
        "Ignore Extra Words (accepts if answer appears in typed text)"
    )
    ignore_extra_words_cb.setChecked(config.get("ignore_extra_words", False))
    ignore_extra_words_cb.setToolTip(
        "Useful for cloze deletion cards ({{type:cloze:Field}}) where users may type the full sentence.\n"
        "When enabled, your answer is marked correct if you typed the correct phrase somewhere in your response, even with extra words.\n"
        "For example, if the correct answer is 'cat' and the user types 'the cat', it will be accepted as correct."
    )

    # Add widgets to layout
    layout.addWidget(ignore_case_cb)
    layout.addWidget(ignore_accents_cb)
    layout.addWidget(ignore_punct_cb)
    layout.addWidget(ignore_extra_words_cb)

    # Save button
    save_button = QPushButton("Save")

    def save_settings():
        if not mw:
            return

        new_config = {
            "ignore_case": ignore_case_cb.isChecked(),
            "ignore_accents": ignore_accents_cb.isChecked(),
            "ignore_punctuations": ignore_punct_cb.isChecked(),
            "ignore_extra_words": ignore_extra_words_cb.isChecked(),
        }

        # Save the settings
        mw.addonManager.writeConfig(
            g.__addon_id__,
            new_config,
        )
        dialog.accept()

        on_config_save(json.dumps(new_config), g.__addon_id__)

    qconnect(save_button.clicked, save_settings)
    layout.addWidget(save_button)

    # Set layout and show dialog
    dialog.setLayout(layout)
    dialog.exec()
