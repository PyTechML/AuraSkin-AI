"""Placeholder registry for future CNN models. Rule-based classifier does not use this."""
_MODELS = {}

def register(name: str, loader):
    _MODELS[name] = loader

def get(name: str):
    return _MODELS.get(name)
