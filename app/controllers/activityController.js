// Activity Controller
module.exports = {
    // Get activity page with statistics
    getActivity: async (req, res) => {
        try {
            const userId = req.user._id;

            // Get total entries count
            const totalEntries = await req.db.collection('messages').countDocuments({
                createdBy: userId
            });

            // Get bookmarked entries count
            const bookmarkedEntries = await req.db.collection('messages').countDocuments({
                createdBy: userId,
                isBookmarked: true
            });

            // Get entries from last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const recentEntries = await req.db.collection('messages').countDocuments({
                createdBy: userId,
                createdAt: { $gte: sevenDaysAgo }
            });

            // Get entries from last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const monthlyEntries = await req.db.collection('messages').countDocuments({
                createdBy: userId,
                createdAt: { $gte: thirtyDaysAgo }
            });

            // Get entries grouped by month for chart data
            const monthlyData = await req.db.collection('messages').aggregate([
                {
                    $match: {
                        createdBy: userId,
                        createdAt: { $gte: new Date(new Date().getFullYear(), 0, 1) } // Current year
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" }
                        },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { "_id.year": 1, "_id.month": 1 }
                }
            ]).toArray();

            // Calculate streak data
            const allEntries = await req.db.collection('messages').find({
                createdBy: userId
            }).sort({ createdAt: 1 }).toArray();

            let currentStreak = 0;
            let longestStreak = 0;
            let tempStreak = 0;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Group entries by date
            const entriesByDate = {};
            allEntries.forEach(entry => {
                const entryDate = new Date(entry.createdAt);
                entryDate.setHours(0, 0, 0, 0);
                const dateKey = entryDate.toISOString().split('T')[0];
                entriesByDate[dateKey] = true;
            });

            // Calculate current streak (consecutive days from today backwards)
            let checkDate = new Date(today);
            while (entriesByDate[checkDate.toISOString().split('T')[0]]) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            }

            // Calculate longest streak
            const sortedDates = Object.keys(entriesByDate).sort();
            for (let i = 0; i < sortedDates.length; i++) {
                if (i === 0) {
                    tempStreak = 1;
                } else {
                    const prevDate = new Date(sortedDates[i - 1]);
                    const currDate = new Date(sortedDates[i]);
                    const dayDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
                    
                    if (dayDiff === 1) {
                        tempStreak++;
                    } else {
                        longestStreak = Math.max(longestStreak, tempStreak);
                        tempStreak = 1;
                    }
                }
            }
            longestStreak = Math.max(longestStreak, tempStreak);

            // Calculate additional stats
            const avgEntriesPerWeek = totalEntries > 0 ? Math.round((totalEntries / Math.max(1, Math.ceil((new Date() - new Date(allEntries[0]?.createdAt || new Date())) / (1000 * 60 * 60 * 24 * 7)))) * 10) / 10 : 0;

            // Calculate day of week data
            const dayOfWeekData = [0, 0, 0, 0, 0, 0, 0]; // Sun, Mon, Tue, Wed, Thu, Fri, Sat
            allEntries.forEach(entry => {
                const dayOfWeek = new Date(entry.createdAt).getDay();
                dayOfWeekData[dayOfWeek]++;
            });

            // Calculate entry length trend data
            const entryDates = [];
            const entryLengths = [];
            allEntries.forEach(entry => {
                entryDates.push(new Date(entry.createdAt).toLocaleDateString());
                entryLengths.push(entry.text ? entry.text.length : 0);
            });

            // Format data for Chart.js
            const chartData = {
                labels: [],
                data: [],
                totalEntries,
                bookmarkedCount: bookmarkedEntries,
                avgEntriesPerWeek,
                dayOfWeekData,
                monthLabels: [],
                monthData: [],
                entryDates,
                entryLengths,
                streakData: {
                    currentStreak,
                    longestStreak
                }
            };

            const monthNames = [
                'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
            ];

            monthlyData.forEach(item => {
                chartData.labels.push(`${monthNames[item._id.month - 1]} ${item._id.year}`);
                chartData.data.push(item.count);
                chartData.monthLabels.push(`${monthNames[item._id.month - 1]} ${item._id.year}`);
                chartData.monthData.push(item.count);
            });

            res.render('activity.ejs', {
                title: 'Eremos - Activity',
                user: req.user,
                stats: {
                    totalEntries,
                    bookmarkedEntries,
                    recentEntries,
                    monthlyEntries
                },
                chartData: chartData,
                error: req.flash('error'),
                success: req.flash('success')
            });

        } catch (error) {
            console.error('Error fetching activity data:', error);
            req.flash('error', 'Could not load activity data.');
            res.redirect('/profile');
        }
    }
};
