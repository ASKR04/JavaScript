# EventWeave Trace Format 1.0

EventWeave accepts product-neutral workflow traces as JSON or newline-delimited JSON (NDJSON). Imported files remain in the browser. The version-one boundary accepts at most 2 MiB and 20,000 events per import.

## JSON envelope

JSON imports use a versioned envelope:

```json
{
  "schemaVersion": "1.0",
  "events": [
    {
      "id": "checkout-001",
      "sessionId": "checkout-success",
      "timestamp": "2026-09-04T14:00:00.000Z",
      "type": "user.action",
      "actor": "shopper",
      "message": "Submitted checkout",
      "outcome": "success",
      "attributes": { "surface": "checkout", "attempt": 1 }
    }
  ]
}
```

## NDJSON

Each non-empty line is one event object. NDJSON does not include an envelope; EventWeave applies the current version-one event contract. Syntax errors include the source line number and prevent the entire import from being committed.

```ndjson
{"id":"checkout-001","sessionId":"checkout-failure","timestamp":"2026-09-04T14:05:00.000Z","type":"user.action","actor":"shopper","message":"Submitted checkout","outcome":"success"}
{"id":"checkout-002","sessionId":"checkout-failure","timestamp":"2026-09-04T14:05:00.045Z","type":"network.request","actor":"checkout-api","message":"Payment requested","parentId":"checkout-001","durationMs":428,"outcome":"failure"}
```

## Event fields

| Field | Required | Contract |
| --- | --- | --- |
| `id` | Yes | Unique, non-empty, unpadded string across the imported trace. |
| `sessionId` | Yes | Non-empty, unpadded string used to group events. |
| `timestamp` | Yes | ISO 8601 date-time with a valid absolute instant. |
| `type` | Yes | Product-neutral event category such as `user.action` or `network.response`. |
| `actor` | Yes | Component, service, user role, or state owner responsible for the event. |
| `message` | Yes | Concise human-readable event description. |
| `durationMs` | No | Non-negative finite number. |
| `outcome` | No | `success`, `failure`, or `unknown`; defaults to `unknown`. |
| `parentId` | No | ID of an event in the same session at the same or an earlier timestamp. |
| `attributes` | No | Flat object containing string, number, boolean, or null values. |

Unknown top-level event fields are ignored in version one. Attributes remain untrusted metadata and are exposed only as primitive values.

## Normalization invariants

- Events are ordered by timestamp and then by ID for deterministic ties.
- Sessions are ordered by their first event.
- A session fails if any event fails; otherwise it is unknown if any event is unknown, and successful only when every event succeeds.
- Session duration runs from the first event timestamp through the last event's optional duration.
- Sequence relations connect adjacent events within a session.
- Parent relations are emitted only after every referenced ID is proven to exist in the same session, at the same or an earlier timestamp, without forming a cycle.
- Any validation error rejects the whole import; EventWeave never exposes a partial trace as valid evidence.

The sample files in `public/samples/` describe the same checkout journey with successful and failed outcomes, providing a stable comparison pair for upcoming timeline work.
