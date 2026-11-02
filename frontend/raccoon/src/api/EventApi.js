const API_URL = process.env.REACT_APP_API_URL;

export async function GetEventDetails(eventId, accessToken) {
    const response = await fetch(`${API_URL}/events/${eventId}`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`,
            }});

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error("حدث خطأ عند استرجاع معلومات الباقه.");
        error.status = response.status;
        throw error;
    }
    return data;
}

export async function StartRound(eventId, accessToken) {
    const response = await fetch(`${API_URL}/events/${eventId}`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                "title": null,
                "status": "live"
            })
        });

    if (!response.ok) {
        const error = new Error("حدث خطأ عند بدءالجولة.");
        error.status = response.status;
        throw error;
    }
}