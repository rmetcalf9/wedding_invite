
/*
 * Wedding invitation data layer
 *
 * This is currently mocked. Later, getInvitationData()
 * will make the real API request.
 */

window.WeddingInvitationData = {

  async getInvitationData(id) {

    // Simulate the structure returned by the future service.
    // Replace this function's contents when the endpoint exists.
    await new Promise(r => setTimeout(r, 2000));


    return {
      body: {
        id: id || "none",
        envelope_front: "Your Invitation",
        guests: []
      }
    };

  }

};
