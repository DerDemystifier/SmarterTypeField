import json
import os

from anki.cards import Card
from aqt import gui_hooks, mw
from aqt.addons import AddonMeta, AddonsDialog
from aqt.utils import showInfo

from .config_GUI import open_config_dialog

from .helpers import getConfig, inspectAllNoteTypes, on_config_save, setupAddon, updateConfigFile

from . import globals as g

from .utils import (
    delete_all_deps,
)


# Call the function to check for addon update
@gui_hooks.profile_did_open.append
def startupCheck() -> None:
    """Executed whenever a user profile has been opened

    Please note that this hook will also be called on profile switches, so if you
    are looking to simply delay an add-on action in a single-shot manner,
    `main_window_did_init` is likely the more suitable choice.
    """

    if not mw or not mw.col:
        return

    g.media_collection_dir = mw.col.media.dir()

    # Check if either the it's a fresh install or a new version
    if not all(
        (
            g.__config_timestamp__,  # __config_timestamp__ is None if there's no CONFIG_TIMESTAMP file found
            os.path.exists(
                os.path.join(g.media_collection_dir, f"_smarterTypeField.min{g.__version__}.js")
            ),
        )
    ):
        setupAddon()

    g.__addon_config__ = getConfig()

    # Call the function to insert the script tag
    inspectAllNoteTypes()

    mw.addonManager.setConfigAction(g.__addon_id__, open_config_dialog)


@gui_hooks.card_will_show.append
def inject_addon_config(html: str, card: Card, kind: str) -> str:
    """
    Can modify card text before review/preview.
    """

    # We need to inject the g.__addon_config__ into the card template so that the JS can access it
    if not mw or not mw.col or not g.__addon_config__:
        showInfo("An error occurred while injecting the addon configuration.")
        return html

    # kind is either "reviewQuestion" or "reviewAnswer"
    if kind != "reviewAnswer":
        return html

    js_code = f"""
        window.addon_config = {json.dumps(g.__addon_config__)};
    """
    # Wrap JS code in script tags
    script_element = f"<script>{js_code}</script>"

    # Prepend script to answer HTML
    new_html = script_element + html

    return new_html


@gui_hooks.addons_dialog_did_change_selected_addon.append
def on_addons_dialog_did_change_selected_addon(dialog: AddonsDialog, addon: AddonMeta) -> None:
    """
    Allows doing an action when a single add-on is selected.

    Args:
        dialog (AddonsDialog): The addons dialog instance.
        addon (AddonMeta): Metadata of the selected addon.
    """
    if not mw or not mw.col:
        return

    is_enabled = mw.addonManager.isEnabled(g.__addon_id__)

    # g.__addon_config__["enabled"] serves as the cached previous enabled state.
    # This hook fires on every addon *selection* in the dialog, not only on toggle,
    # so we compare against the cached value to detect an actual state change.
    #
    # The "enabled" flag is also written to the JSON config file consumed by the
    # JS on AnkiDroid/AnkiMobile, where the addon manager doesn't exist. That way,
    # disabling on desktop propagates to mobile via the synced config file.
    if g.__addon_config__ and g.__addon_config__.get("enabled") != is_enabled:
        g.__addon_config__, g.__config_timestamp__ = updateConfigFile()

        if is_enabled:
            # Addon was just enabled: inject/update script tags in all templates
            inspectAllNoteTypes()
        else:
            # Addon was just disabled: remove script tags from all templates
            inspectAllNoteTypes("uninstall")


gui_hooks.addon_config_editor_will_update_json.append(on_config_save)


@gui_hooks.addons_dialog_will_delete_addons.append
def on_addons_dialog_will_delete_addons(dialog: AddonsDialog, addon_ids: list[str]) -> None:
    """
    Allows doing an action when the user deletes one or more add-ons.

    Args:
        dialog (AddonsDialog): The addons dialog instance.
        addon_ids (list[str]): List of add-on IDs that will be deleted.
    """
    if not mw or not mw.col or not g.media_collection_dir:
        raise Exception("SmarterTypeField: An error occurred while uninstalling the addon.")

    if g.__addon_id__ in addon_ids:
        inspectAllNoteTypes("uninstall")
        delete_all_deps(g.media_collection_dir, "_smarterTypeField")
