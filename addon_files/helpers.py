import json
import os
import re  # Added import for regex
import shutil
from typing import Any, Dict

from aqt import mw
from aqt.utils import showInfo

from . import globals as g

from .utils import (
    addScriptTag,
    currentTimestamp,
    delete_all_deps,
    readFile,
    removeScriptTag,
    writeToFile,
)


def addon_script_tag() -> str:
    """
    Generates an HTML script tag for the SmarterTypeField addon.

    The script tag includes the role attribute set to 'smarterTypeField',
    the source file with the version number, and a data-config attribute
    with a configuration timestamp.

    Returns:
        str: A formatted HTML script tag as a string.
    """
    return f"""<script role='smarterTypeField' src="_smarterTypeField.min{g.__version__}.js" data-config="{g.__config_timestamp__}"></script>"""


def getConfig() -> dict[str, Any]:
    """
    Retrieve the configuration for the addon.
    This function fetches the configuration settings for the addon from Anki's addon manager.
    If the addon manager is not available, it returns an empty dictionary.

    The configuration is loaded from the addon's configuration file (config.json) if it is not already present
    in the addon manager.
    Additionally, it updates the configuration with the enabled status of the addon.

    Returns:
        dict[str, Any]: A dictionary containing the configuration settings for the addon.
    """
    if not mw:
        return {}

    # Fetch the configuration from the addon manager or load the default from the config file
    config = mw.addonManager.getConfig(g.__addon_id__) or json.loads(
        readFile(os.path.join(g.ADDON_PATH, "config.json")) or "{}"
    )

    # Update the configuration with the addon 'enabled' status
    config.update({"enabled": mw.addonManager.isEnabled(g.__addon_id__)})
    return config


def updateConfigFile(config: Dict[str, Any] = {}) -> tuple[dict[str, Any], str]:
    """
    Updates the configuration file for the SmarterTypeField addon.
    Args:
        config (Dict[str, Any], optional): A dictionary containing the configuration settings.
                                           If not provided, the current configuration will be fetched.
    Returns:
        tuple[dict[str, Any], str]: A tuple containing the updated configuration dictionary and the timestamp
                                    of when the configuration was updated.
    Notes:
        - If the config is not provided, it fetches the current configuration using `getConfig()`.
        - The function updates the config with the addon 'enabled' status.
        - Deletes all dependencies related to the previous configuration.
        - Writes the updated configuration to a file with a timestamp.
        - Writes the timestamp to a separate file named "CONFIG_TIMESTAMP".
    """

    if not mw:
        return (config, "")

    if not config:
        config = getConfig()
    else:
        # If config is provided, just update the 'enabled' status
        config.update({"enabled": mw.addonManager.isEnabled(g.__addon_id__)})

    if g.__config_timestamp__:
        # if a config was previously saved, check if the new config is the same as the old config

        # parse config file from the json file (if it exists)
        old_config = json.loads(
            readFile(
                os.path.join(g.ADDON_PATH, f"_smarterTypeField.config{g.__config_timestamp__}.json")
            )
            or "{}"
        )

        # if the config is the same as the old config, just return the old config, no need to update
        if config == old_config:
            return (config, g.__config_timestamp__)

    timestamp = currentTimestamp()
    delete_all_deps(g.media_collection_dir, "_smarterTypeField.config")

    # update the configuration file with the new configuration
    writeToFile(
        os.path.join(g.media_collection_dir, f"_smarterTypeField.config{timestamp}.json"),
        json.dumps(config, indent=4),
    )

    # update the configuration timestamp file so JS can fetch the latest config
    writeToFile(
        os.path.join(g.ADDON_PATH, "CONFIG_TIMESTAMP"),
        timestamp,
    )

    return (config, timestamp)


def inspectNoteType(note_type: Any, intent: str) -> None:
    """
    Inspects and updates the note type templates based on the presence of type fields and script tags.
    Args:
        note_type (Any): The note type object containing card templates.
        intent (str): The intent of the operation, can be "uninstall" or "install".
    Returns:
        None
    """

    # Get the card templates for the model
    card_types = note_type["tmpls"]

    type_pattern = re.compile(r"{{.*type:.+}}", flags=re.IGNORECASE)
    script_tag = "<script role='smarterTypeField'"

    if not mw or not mw.col:
        return

    updated = False
    for card_type in card_types:
        question_template = card_type["qfmt"]  # Question template
        answer_template = card_type["afmt"]  # Answer template

        has_script_tag = script_tag in answer_template or script_tag in question_template

        if (
            has_script_tag
            and not type_pattern.search(question_template)  # or answer_template, no matter
        ) or intent == "uninstall":
            # if there's no type field anymore in the card or the user wants to uninstall it

            updated = True
            card_type["qfmt"] = removeScriptTag(card_type["qfmt"])
            card_type["afmt"] = removeScriptTag(card_type["afmt"])
        elif type_pattern.search(question_template) and (
            g.__version__ not in answer_template
            or g.__version__ not in question_template
            or (g.__config_timestamp__ not in answer_template if g.__config_timestamp__ else True)
            or (g.__config_timestamp__ not in question_template if g.__config_timestamp__ else True)
        ):
            # Otherwise, if the type field is present but the script tag is not present or is outdated

            updated = True
            card_type["qfmt"] = addScriptTag(card_type["qfmt"], addon_script_tag())
            card_type["afmt"] = addScriptTag(card_type["afmt"], addon_script_tag())

    if updated:
        # Update the model in the collection
        mw.col.models.save(note_type)


def inspectAllNoteTypes(intent: str = "install") -> None:
    if not mw or not mw.col:
        return

    # Get the current collection from the main window
    models = mw.col.models.all()
    # Iterate through each model
    for note_type in models:
        inspectNoteType(note_type, intent)


def setupAddon():
    if not g.media_collection_dir:
        showInfo("Media collection directory not found.")
        return

    # setup Media Folder
    path_js = os.path.join(g.ADDON_PATH, "_smarterTypeField.min.js")
    filename_save = f"_smarterTypeField.min{g.__version__}.js"

    # copy file to media folder after deleting all previous versions
    delete_all_deps(g.media_collection_dir, "_ignoreCase")  # Remove this line in later versions
    delete_all_deps(g.media_collection_dir, "_smarterTypeField.min")
    shutil.copyfile(path_js, os.path.join(g.media_collection_dir, filename_save))

    g.__addon_config__, g.__config_timestamp__ = updateConfigFile()


def on_config_save(config_text: str, addon: str) -> str:
    """
    Triggered when the user saves the configuration of the add-on.\n
    Allows changing the text of the json configuration that was received from the user before actually reading it.\n
    For example, you can replace new line in strings by some "\\\\n".

    Args:
        config_text (str): The JSON text of the configuration.
        addon (str): The name of the add-on being configured.
    Returns:
        str: The original configuration text.
    """

    if not mw or not mw.addonManager or addon != g.__addon_id__:
        return config_text

    # Update the global g.__addon_config__ variable with the parsed g.__addon_config__
    g.__addon_config__, g.__config_timestamp__ = updateConfigFile(json.loads(config_text))
    inspectAllNoteTypes()

    return config_text
