import os
import re
import time
from typing import Optional


def delete_all_deps(path: str, prefix: str = ""):
    """
    Deletes all files in the specified directory that start with the given prefix.

    Args:
        path (str): The directory path where the files are located.
        prefix (str, optional): The prefix to match files. Defaults to an empty string, which matches all files.

    Raises:
        FileNotFoundError: If the specified directory does not exist.
        PermissionError: If the program does not have permission to delete a file.
    """
    for file in os.listdir(path):
        if file.startswith(prefix):
            os.remove(os.path.join(path, file))


def addScriptTag(template: str, script_tag: str) -> str:
    """
    Adds a script tag to the given template string.

    This function first removes any existing version of the script tag from the template
    using the removeScriptTag function, and then appends the new script tag to the template.

    Args:
        template (str): The HTML template string to which the script tag will be added.
        script_tag (str): The script tag to be added to the template.

    Returns:
        str: The updated template string with the new script tag appended.
    """
    template = removeScriptTag(template)
    template = template + "\n " * 10 + script_tag
    return template


def removeScriptTag(template: str) -> str:
    """
    Remove specific <script> tags from the given HTML template string.

    This function uses regular expressions to remove any <script> tags with
    the role attribute set to 'smarterTypeField' from the
    provided HTML template string. The function then strips any leading or
    trailing whitespace from the resulting string.

    Args:
        template (str): The HTML template string from which to remove the
                        <script> tags.

    Returns:
        str: The modified HTML template string with the specified <script>
             tags removed and any leading or trailing whitespace stripped.
    """
    template = re.sub(
        "<script role='ignoreCase'.+script>", "", template, flags=re.IGNORECASE
    )  # Remove this line in later versions
    template = re.sub("<script role='smarterTypeField'.+script>", "", template, flags=re.IGNORECASE)
    template = template.strip()
    return template


def currentTimestamp() -> str:
    """
    Returns the current timestamp as a string formatted as 'YYYY-MM-DD_HH-MM-SS'.

    Returns:
        str: The current timestamp in the format 'YYYY-MM-DD_HH-MM-SS'.
    """
    return time.strftime("%Y-%m-%d_%H-%M-%S")


def readFile(path: str) -> Optional[str]:
    """
    Reads the content of a file if it exists.
    Args:
        path (str): The path to the file.
    Returns:
        Optional[str]: The content of the file as a string if the file exists,
                       otherwise None.
    """
    if not os.path.exists(path):
        return None

    with open(path) as file:
        return file.read()


def writeToFile(path: str, content: str) -> None:
    """
    Writes the given content to a file at the specified path.

    Args:
        path (str): The path to the file where the content will be written.
        content (str): The content to write to the file.

    Returns:
        None
    """
    with open(path, "w") as f:
        f.write(content)
