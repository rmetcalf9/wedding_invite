# Wedding invitation website

Built by Robert

## Publish with GitHub Pages

Github action does the Publish


## Service data structure

body: {
  id: "ddddd",    (none is special value)
  envelope_front: "Boy & Mary Metcalf",
  guests: [
    {
      name: "Bob",
      status: "not_answered"    (unknown/decline/accept)
    }
    response_received_date:
  ]
}


# Default (no id, id=none, servicetimeout)
body: {
  id: "none",
  envelope_front: "Your Invitation",
  guests: []
}

# Sample two guests
body: {
  id: "ddddd",
  envelope_front: "Boy & Mary Metcalf",
  guests: [
    {
      name: "Bob",
      status: "not_answered"    (unknown/decline/accept)
    }
    response_received_date: null
  ]
}
