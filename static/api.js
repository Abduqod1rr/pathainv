async function generateRoadmap(userProfile, goalTitle) {
    console.log('Generating roadmap for:', goalTitle);
    
    const context = {};
    if (userProfile.age) context.age = userProfile.age;
    if (userProfile.industry) context.industry = userProfile.industry;
    
    try {
        console.log('Calling backend AI endpoint...');
        
        const response = await fetch('/api/generate-roadmap/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: goalTitle,
                context: context
            })
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('API error:', errorData);
            throw new Error(errorData.error || 'API failed');
        }
        
        const data = await response.json();
        console.log('Got quests:', data.quests?.length);
        
        if (data.quests && data.quests.length > 0) {
            return data.quests;
        }
        
        throw new Error('No quests returned');
        
    } catch (e) {
        console.error('AI failed:', e.message);
        alert('AI generation failed. Please try again.');
        return [];
    }
}