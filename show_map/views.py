from django.shortcuts import render
from django.views.generic import TemplateView

class Googlemap(TemplateView):
    template_name = 'googlemap.haml'
    def get(self, request, *args, **kwargs):
        search = ["---","駅","コンビニ","飲食店"]
        transportation = ["徒歩", "車"]
        return render(request, 'googlemap.haml', {"search": search, "transportation": transportation})

googlemap = Googlemap.as_view()