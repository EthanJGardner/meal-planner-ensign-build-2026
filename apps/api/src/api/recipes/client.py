"""Reads recipes from Qdrant, where scripts/ingest_recipes.py loads them."""

from collections.abc import Iterable

import httpx
from pydantic import BaseModel

# The only parts of a recipe the API uses so far.
_FIELDS = ["name", "ingredients", "servings", "image_url"]


class RecipesUnavailable(Exception):
    """Qdrant can't be reached, or has no recipes collection."""


class RecipeNotFound(Exception):
    def __init__(self, ids: list[int]) -> None:
        super().__init__(f"No recipe with id {', '.join(map(str, ids))}")
        self.ids = ids


class Recipe(BaseModel):
    id: int
    name: str
    # One normalized name per ingredient, such as 'chicken breast'. The amounts
    # are left in Qdrant: they have no units, and over a quarter of the recipes
    # have a different number of amounts than names.
    ingredients: list[str] = []
    servings: int | None = None
    image_url: str | None = None


class RecipeClient:
    def __init__(self, http: httpx.AsyncClient, collection: str) -> None:
        # http must be created with base_url set to Qdrant.
        self._http = http
        self._collection = collection

    async def get(self, ids: Iterable[int]) -> dict[int, Recipe]:
        """The recipes with these ids, by id. Raises RecipeNotFound if any is missing."""
        wanted = sorted(set(ids))
        try:
            response = await self._http.post(
                f"/collections/{self._collection}/points",
                json={"ids": wanted, "with_payload": _FIELDS},
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise RecipesUnavailable(f"The recipes could not be read: {exc}") from exc
        found = {
            point["id"]: Recipe(id=point["id"], **point["payload"])
            for point in response.json()["result"]
        }
        if missing := [recipe_id for recipe_id in wanted if recipe_id not in found]:
            raise RecipeNotFound(missing)
        return found
