import random
from datetime import datetime

class ThemeManager:
    THEMES = [
        "Minecraft",
        "Pranks",
        "Fail Compilation",
        "Cooking Fails",
        "Street Interviews",
        "Dashcam Footage",
        "Parkour",
        "Magic Tricks",
        "Cute Animals",
        "Hydraulic Press",
    ]

    @classmethod
    def get_daily_theme(cls) -> str:
        """
        Returns a theme based on the current date.
        Ensures the same theme is selected for the entire day.
        """
        today = datetime.now().date()
        random.seed(today.toordinal())
        theme = random.choice(cls.THEMES)
        random.seed() 
        return theme

def get_daily_theme():
    return ThemeManager.get_daily_theme()

