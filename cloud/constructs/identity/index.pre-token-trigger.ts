const handler = async (event) => {
  console.log({event: JSON.stringify(event, null, 2)})

  event.response = {
    claimsOverrideDetails: {
      claimsToAddOrOverride: {
        defaultProject: event.request.userAttributes.preferred_username
      },
    },
  };

  return event;
};

export { handler };