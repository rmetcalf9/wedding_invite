window.WeddingInvitationData = {

  async getInvitationData(id) {
    // console.log('invitation-data.js getInvitationData started')

    const fallback = {
      body: {
        id: "none",
        envelope_front: "Your Invitation",
        field_1: "",
        field_2: "",
        guests: [],
        rsvp_message: "",
        response_received: false
      }
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(
          `https://api2.metcarob.com/get_wedding_invite?id=${encodeURIComponent(id || "")}`,
          {
            method: "GET",
            signal: controller.signal
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        responsed = await response.json();

        return {body: responsed};

      } finally {
        clearTimeout(timeout);
      }

    } catch (error) {
      console.error("Failed to retrieve wedding invitation data:", error);
      return fallback;
    }

  }

};
