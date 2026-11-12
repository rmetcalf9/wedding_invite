# Wedding invitation website

Built by Robert

## Publish with GitHub Pages

Github action does the Publish


## Service data structure

curl https://api2.metcarob.com/get_wedding_invite?id=sadsd

body: {
  id: "ddddd",    (none is special value)
  envelope_front: "Boy & Mary Metcalf",
  field_1: ,
  field_2: ,
  guests: [
    {
      name: "Bob",
      status: "not_answered"    (not_answered,decline,accept)
    },
  ]
  response_received_date:,
  rsvp_message: text
}


# Default (no id, id=none, servicetimeout)
body: {
  id: "none",
  envelope_front: "Your Invitation",
2  guests: []
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
  ]
}

## Send RSVP

structure:
{
  id: "abc123",
  response_message: "ASDFDAS",
  guests: [
    name: "Bob",
    status: "accept"
  ]
}
