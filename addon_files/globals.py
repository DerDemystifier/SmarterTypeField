"""
This module contains global variables and utility functions for the SmarterTypeField Anki add-on.

Constants:
    ADDON_PATH (str): The path to the add-on directory.
    VERSION_FILE (str): The path to the version file.
    CONFIG_TIMESTAMP_FILE (str): The path to the configuration timestamp file.

Functions:
    updateVersionFile() -> None:

Variables:
    media_collection_dir (str or None): The directory of the media collection, if available.
    __version__ (Union[str, None]): The version of the add-on, read from the version file.
    __config_timestamp__ (Union[str, None]): The configuration timestamp, read from the configuration timestamp file.
    __addon_config__ (Union[dict[str, Any], None]): The configuration of the add-on, initially set to None.
"""

import os
from typing import Any, Union

from aqt import mw

from .utils import currentTimestamp, readFile, writeToFile

ADDON_PATH = os.path.join(os.path.dirname(os.path.realpath(__file__)))

# VERSION_FILE is used to track the version of the add-on. This allows us to detect when the add-on has been updated so we copy the new js files to the media collection folder.
VERSION_FILE = os.path.join(ADDON_PATH, "VERSION")
CONFIG_TIMESTAMP_FILE = os.path.join(ADDON_PATH, "CONFIG_TIMESTAMP")


def updateVersionFile() -> None:
    """
    Updates the version file with the current timestamp.

    This function writes the current timestamp to the version file specified
    by the VERSION_FILE constant. It uses the writeToFile function to perform
    the file writing operation and the currentTimestamp function to get the
    current timestamp.

    Returns:
        None
    """
    writeToFile(VERSION_FILE, currentTimestamp())


# updateVersionFile()  # Uncomment this line while developing the add-on to update the version file on each run

__addon_id__ = None  # this is the name of the add-on folder, a number assigned by AnkiWeb
if mw and mw.addonManager:
    __addon_id__ = mw.addonManager.addonFromModule(__name__)

media_collection_dir = None
if mw and mw.col:
    media_collection_dir = mw.col.media.dir()

# The version is used to track updates.
__version__: Union[str, None] = readFile(VERSION_FILE)

# The configuration timestamp is passed to the JavaScript code to fetch config json file when on mobile
__config_timestamp__: Union[str, None] = readFile(CONFIG_TIMESTAMP_FILE)

__addon_config__: Union[dict[str, Any], None] = None
