from typing import Protocol

from api.cart.schemas import CartItem


class CartStore(Protocol):
    """Where one user's cart is kept. Rows are unique per store and product."""

    async def list(self) -> list[CartItem]: ...

    async def upsert(self, item: CartItem) -> None: ...

    async def remove(self, store: str, upc: str) -> bool: ...

    async def approve_all(self) -> int:
        """Moves every proposed item into the cart. Returns how many moved."""
        ...


class InMemoryCartStore:
    """Used by tests and the command-line demo until the Supabase cart exists."""

    def __init__(self) -> None:
        self._items: dict[tuple[str, str], CartItem] = {}

    async def list(self) -> list[CartItem]:
        return list(self._items.values())

    async def upsert(self, item: CartItem) -> None:
        self._items[(item.store, item.upc)] = item

    async def remove(self, store: str, upc: str) -> bool:
        return self._items.pop((store, upc), None) is not None

    async def approve_all(self) -> int:
        proposed = [item for item in self._items.values() if item.status == "proposed"]
        for item in proposed:
            self._items[(item.store, item.upc)] = item.model_copy(update={"status": "in_cart"})
        return len(proposed)
